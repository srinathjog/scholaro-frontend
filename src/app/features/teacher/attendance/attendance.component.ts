import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { todayLocal } from '../../../utils/date.util';
import {
  AttendanceService,
  AttendanceRecord,
} from '../../../data/services/attendance.service';
import {
  DailyLogService,
  EnrolledStudent,
} from '../../../data/services/daily-log.service';
import {
  ActivityService,
  TeacherAssignment,
} from '../../../data/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
})
export class AttendanceComponent implements OnInit {
  assignments: TeacherAssignment[] = [];
  students: EnrolledStudent[] = [];
  records: AttendanceRecord[] = [];

  selectedClassId = '';
  today = todayLocal();

  loading = false;
  broadcasting = false;
  successMessage = '';
  errorMessage = '';

  // Completion state
  isAlreadyMarked = false;
  editMode = false;
  broadcastSent = false;
  isBulkSaving = false;

  /**
   * All status changes live here first — nothing hits the DB until onSave().
   * Seeded from saved records on load and on enterEditMode().
   */
  pendingStatuses = new Map<string, AttendanceStatus>();

  todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  constructor(
    private attendanceService: AttendanceService,
    private dailyLogService: DailyLogService,
    private activityService: ActivityService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService['currentUserSubject'].value;
    if (!user) return;
    this.activityService.getClassesByTeacher(user.userId).subscribe({
      next: (assignments) => {
        this.assignments = assignments;
        if (assignments.length === 1) {
          this.selectedClassId = assignments[0].class_id;
          this.onClassChange();
        }
        this.cdr.detectChanges();
      },
    });
  }

  onClassChange(): void {
    if (!this.selectedClassId) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    forkJoin({
      students: this.dailyLogService.getStudentsByClass(this.selectedClassId),
      records: this.attendanceService.getAttendanceByClass(this.selectedClassId, this.today),
    }).subscribe({
      next: ({ students, records }) => {
        this.students = students;
        this.records = records;
        this.loading = false;

        // Seed pending statuses from saved records so getStatus() works immediately
        this.pendingStatuses.clear();
        for (const rec of records) {
          this.pendingStatuses.set(rec.enrollment_id, rec.status);
        }

        // Detect completion: if every student already has a record, show summary
        this.isAlreadyMarked = students.length > 0 && records.length >= students.length;
        this.editMode = false;
        this.broadcastSent = this.isBroadcastSent();

        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load class data.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Get current status — always reads from local pending state */
  getStatus(enrollmentId: string): AttendanceStatus | null {
    return this.pendingStatuses.get(enrollmentId) ?? null;
  }

  /** Update status instantly in local state. No API call. Zero lag. */
  updateStatusLocally(enrollmentId: string, status: AttendanceStatus): void {
    this.pendingStatuses.set(enrollmentId, status);
    this.cdr.detectChanges();
  }

  /** Mark all currently-unmarked students as Present locally */
  markAllPresent(): void {
    for (const s of this.students) {
      if (!this.pendingStatuses.has(s.id)) {
        this.pendingStatuses.set(s.id, 'present');
      }
    }
    this.cdr.detectChanges();
  }

  /** Broadcast "arrived safely" to all present students' parents */
  broadcastArrival(): void {
    if (this.broadcasting || this.broadcastSent) return;
    this.broadcasting = true;
    this.errorMessage = '';

    this.attendanceService.broadcastArrival(this.selectedClassId, this.today).subscribe({
      next: (result) => {
        this.broadcasting = false;
        this.broadcastSent = true;
        this.markBroadcastSent();
        this.successMessage = `✅ Attendance shared with ${result.notified} parent(s)!`;
        this.isAlreadyMarked = true;
        this.editMode = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to send notifications.';
        this.broadcasting = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Stats getters — read from local pending state for instant accuracy */
  get presentCount(): number {
    return Array.from(this.pendingStatuses.values()).filter(s => s === 'present').length;
  }

  get absentCount(): number {
    return Array.from(this.pendingStatuses.values()).filter(s => s === 'absent').length;
  }

  get leaveCount(): number {
    return Array.from(this.pendingStatuses.values()).filter(s => s === 'leave').length;
  }

  get unmarkedCount(): number {
    return this.students.filter(s => !this.pendingStatuses.has(s.id)).length;
  }

  get allMarked(): boolean {
    return this.students.length > 0 && this.students.every(s => this.pendingStatuses.has(s.id));
  }

  /** True when there are any pending statuses (fresh or edited) to save */
  get hasPendingChanges(): boolean {
    return this.pendingStatuses.size > 0;
  }

  getInitials(student: EnrolledStudent): string {
    return (student.student.first_name?.[0] || '') + (student.student.last_name?.[0] || '');
  }

  getClassName(): string {
    const a = this.assignments.find((x) => x.class_id === this.selectedClassId);
    return a?.assignedClass?.name || 'Class';
  }

  /** Enter edit mode — pending statuses already seeded from records on load */
  enterEditMode(): void {
    this.editMode = true;
    this.cdr.detectChanges();
  }

  /** Discard local changes and exit edit mode */
  cancelEdit(): void {
    // Restore from saved records
    this.pendingStatuses.clear();
    for (const rec of this.records) {
      this.pendingStatuses.set(rec.enrollment_id, rec.status);
    }
    this.editMode = false;
    this.cdr.detectChanges();
  }

  /**
   * Commit all pending statuses to the backend in one parallel batch.
   * Used for both fresh attendance and edits.
   * On success: show toast, redirect to /teacher/home.
   */
  onSave(): void {
    if (this.isBulkSaving || !this.pendingStatuses.size) return;
    this.isBulkSaving = true;
    this.errorMessage = '';

    const updates$ = Array.from(this.pendingStatuses.entries()).map(
      ([enrollmentId, status]) =>
        this.attendanceService.markAttendance({
          enrollment_id: enrollmentId,
          date: this.today,
          status,
        }),
    );

    forkJoin(updates$).subscribe({
      next: (savedRecords) => {
        // Sync saved records back
        for (const rec of savedRecords) {
          const idx = this.records.findIndex(r => r.enrollment_id === rec.enrollment_id);
          if (idx >= 0) this.records[idx] = rec;
          else this.records.push(rec);
        }
        this.editMode = false;
        this.isBulkSaving = false;
        this.successMessage = '✅ Attendance Saved';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/teacher/home']), 1200);
      },
      error: () => {
        this.errorMessage = 'Failed to save. Please check your connection and try again.';
        this.isBulkSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Check if broadcast was already sent today for this class */
  private isBroadcastSent(): boolean {
    return localStorage.getItem(this.broadcastKey) === 'true';
  }

  /** Persist broadcast state for today */
  private markBroadcastSent(): void {
    localStorage.setItem(this.broadcastKey, 'true');
  }

  private get broadcastKey(): string {
    return `broadcast_${this.selectedClassId}_${this.today}`;
  }

  /** Students grouped by status for summary view */
  get presentStudents(): EnrolledStudent[] {
    return this.students.filter(s => this.getStatus(s.id) === 'present');
  }

  get absentStudents(): EnrolledStudent[] {
    return this.students.filter(s => this.getStatus(s.id) === 'absent');
  }

  get lateStudents(): EnrolledStudent[] {
    return this.students.filter(s => this.getStatus(s.id) === 'late');
  }

  get leaveStudents(): EnrolledStudent[] {
    return this.students.filter(s => this.getStatus(s.id) === 'leave');
  }

  /** Whether to show the locked summary view (not edit mode) */
  get showSummary(): boolean {
    return this.isAlreadyMarked && !this.editMode;
  }

  /** True when the selected date is today — only today allows teacher edits */
  get isToday(): boolean {
    return this.today === todayLocal();
  }
}
