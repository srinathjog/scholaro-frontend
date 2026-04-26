import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ParentService, ParentChild } from '../../../data/services/parent.service';
import { AttendanceService, AttendanceRecord } from '../../../data/services/attendance.service';
import { environment } from '../../../../environments/environment';

// ── Local DTOs ────────────────────────────────────────────────────────────────

export type EventType = 'holiday' | 'event' | 'exam' | 'ptm';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;          // YYYY-MM-DD
  type: EventType;
  is_school_closed: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-school-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './school-schedule.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolScheduleComponent implements OnInit {

  // ── Tab state ──────────────────────────────────────────────────────────────
  activeTab: 'events' | 'attendance' = 'events';

  // ── Child selector ─────────────────────────────────────────────────────────
  children: ParentChild[] = [];
  selectedChild: ParentChild | null = null;
  loadingChildren = true;

  // ── Events tab ─────────────────────────────────────────────────────────────
  events: SchoolEvent[] = [];
  loadingEvents = false;
  eventsError = '';

  // ── Attendance tab ─────────────────────────────────────────────────────────
  attendanceRecords: AttendanceRecord[] = [];
  loadingAttendance = false;
  attendanceError = '';

  constructor(
    private readonly parentService: ParentService,
    private readonly attendanceService: AttendanceService,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.parentService.getMyChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.loadingChildren = false;
        if (children.length === 1) {
          this.selectChild(children[0]);
        } else {
          // Pre-load events immediately — they are school-wide (no child needed)
          this.loadEvents();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingChildren = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  switchTab(tabName: 'events' | 'attendance'): void {
    if (this.activeTab === tabName) return;
    this.activeTab = tabName;

    if (tabName === 'events' && this.events.length === 0 && !this.loadingEvents) {
      this.loadEvents();
    }

    if (tabName === 'attendance') {
      const enrollmentId = this.activeEnrollmentId;
      if (enrollmentId && this.attendanceRecords.length === 0 && !this.loadingAttendance) {
        this.loadAttendance(enrollmentId);
      }
    }

    this.cdr.markForCheck();
  }

  // ── Child selection ────────────────────────────────────────────────────────

  selectChild(child: ParentChild): void {
    this.selectedChild = child;
    // Reset attendance cache so fresh data is fetched for the new child
    this.attendanceRecords = [];
    this.attendanceError = '';

    if (this.activeTab === 'attendance') {
      const enrollmentId = this.activeEnrollmentId;
      if (enrollmentId) this.loadAttendance(enrollmentId);
    }

    // Events are school-wide — no need to re-fetch on child change
    if (this.events.length === 0 && !this.loadingEvents) {
      this.loadEvents();
    }

    this.cdr.markForCheck();
  }

  // ── Data loaders ───────────────────────────────────────────────────────────

  private loadEvents(): void {
    this.loadingEvents = true;
    this.eventsError = '';

    this.http
      .get<SchoolEvent[]>(`${environment.apiUrl}/calendar`)
      .subscribe({
        next: (events) => {
          this.events = events;
          this.loadingEvents = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.eventsError = 'Could not load school events. Please try again.';
          this.loadingEvents = false;
          this.cdr.markForCheck();
        },
      });
  }

  private loadAttendance(enrollmentId: string): void {
    this.loadingAttendance = true;
    this.attendanceError = '';

    this.attendanceService.getAttendanceByStudent(enrollmentId).subscribe({
      next: (records) => {
        // Sort newest first
        this.attendanceRecords = records.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        this.loadingAttendance = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.attendanceError = 'Could not load attendance history. Please try again.';
        this.loadingAttendance = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Returns the first enrollment ID for the selected child, or null. */
  get activeEnrollmentId(): string | null {
    return this.selectedChild?.enrollments?.[0]?.id ?? null;
  }

  /** Human-readable label for an event type badge. */
  eventTypeLabel(type: EventType): string {
    const labels: Record<EventType, string> = {
      holiday: 'Holiday',
      event: 'Event',
      exam: 'Exam',
      ptm: 'PTM',
    };
    return labels[type] ?? type;
  }

  /** CSS classes for attendance status badge. */
  statusClass(status: string): string {
    const map: Record<string, string> = {
      present: 'bg-emerald-100 text-emerald-700',
      absent:  'bg-red-100 text-red-700',
      late:    'bg-amber-100 text-amber-700',
      leave:   'bg-sky-100 text-sky-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  /** CSS classes for the event-type badge (red = holiday, blue = event, purple = exam, amber = ptm). */
  eventTypeBadgeClass(type: EventType): string {
    const map: Record<EventType, string> = {
      holiday: 'bg-red-100 text-red-700',
      event:   'bg-blue-100 text-blue-700',
      exam:    'bg-purple-100 text-purple-700',
      ptm:     'bg-amber-100 text-amber-700',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600';
  }

  /** Events grouped by month label for sectioned display. */
  get eventsGroupedByMonth(): { month: string; events: SchoolEvent[] }[] {
    const grouped = new Map<string, SchoolEvent[]>();
    for (const ev of this.events) {
      const key = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ev);
    }
    return Array.from(grouped.entries()).map(([month, events]) => ({ month, events }));
  }

  /** Last 30 attendance records (already sorted newest-first). */
  get last30DaysAttendance(): AttendanceRecord[] {
    return this.attendanceRecords.slice(0, 30);
  }

  /** Quick summary counts over the last 30 records. */
  get attendanceSummary(): { present: number; absent: number; late: number; leave: number; total: number } {
    const records = this.last30DaysAttendance;
    return {
      present: records.filter(r => r.status === 'present').length,
      absent:  records.filter(r => r.status === 'absent').length,
      late:    records.filter(r => r.status === 'late').length,
      leave:   records.filter(r => r.status === 'leave').length,
      total:   records.length,
    };
  }

  /** Attendance percentage over the last 30 records. */
  get attendancePercentage(): number {
    const { present, total } = this.attendanceSummary;
    return total === 0 ? 0 : Math.round((present / total) * 100);
  }
}
