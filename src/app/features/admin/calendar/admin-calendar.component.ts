import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export type EventType = 'holiday' | 'event' | 'exam' | 'ptm';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  type: EventType;
  is_school_closed: boolean;
}

@Component({
  selector: 'app-admin-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCalendarComponent implements OnInit {

  // ── Events list ───────────────────────────────────────────────────────────
  events: SchoolEvent[] = [];
  loading = false;
  error = '';

  // ── Bulk upload ───────────────────────────────────────────────────────────
  selectedFile: File | null = null;
  uploading = false;
  uploadResult: { success: boolean; count?: number; message?: string } | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  // ── Loaders ───────────────────────────────────────────────────────────────

  loadEvents(): void {
    this.loading = true;
    this.error = '';
    this.http.get<SchoolEvent[]>(`${environment.apiUrl}/calendar`).subscribe({
      next: (events) => {
        this.events = events;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load events. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── File picker ───────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.uploadResult = null;
    this.cdr.markForCheck();
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  uploadFile(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadResult = null;

    const form = new FormData();
    form.append('file', this.selectedFile);

    this.http.post<{ success: boolean; count: number }>(
      `${environment.apiUrl}/calendar/bulk-upload`,
      form,
    ).subscribe({
      next: (res) => {
        this.uploadResult = res;
        this.uploading = false;
        this.selectedFile = null;
        this.loadEvents(); // refresh list
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadResult = {
          success: false,
          message: err?.error?.message ?? 'Upload failed. Please check the file format.',
        };
        this.uploading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get eventsGroupedByMonth(): { month: string; events: SchoolEvent[] }[] {
    const grouped = new Map<string, SchoolEvent[]>();
    for (const ev of this.events) {
      const key = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-IN', {
        month: 'long', year: 'numeric',
      });
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ev);
    }
    return Array.from(grouped.entries()).map(([month, events]) => ({ month, events }));
  }

  eventTypeBadgeClass(type: EventType): string {
    const map: Record<EventType, string> = {
      holiday: 'bg-red-100 text-red-700',
      event:   'bg-blue-100 text-blue-700',
      exam:    'bg-purple-100 text-purple-700',
      ptm:     'bg-amber-100 text-amber-700',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600';
  }

  eventTypeLabel(type: EventType): string {
    const labels: Record<EventType, string> = {
      holiday: 'Holiday', event: 'Event', exam: 'Exam', ptm: 'PTM',
    };
    return labels[type] ?? type;
  }
}
