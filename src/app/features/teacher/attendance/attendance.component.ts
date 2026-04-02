import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
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
  today = new Date().toISOString().slice(0, 10);

  loading = false;
  saving = new Set<string>(); // enrollment IDs currently saving
  broadcasting = false;
  successMessage = '';
  errorMessage = '';

  todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  constructor(
    private attendanceService: AttendanceService,
    private dailyLogService: DailyLogService,
    private activityService: ActivityService,
    private authService: AuthService,
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load class data.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Get current status for a student (from already-saved records) */
  getStatus(enrollmentId: string): AttendanceStatus | null {
    const rec = this.records.find((r) => r.enrollment_id === enrollmentId);
    return rec ? rec.status : null;
  }

  /** Mark a single student */
  markStudent(enrollmentId: string, status: AttendanceStatus): void {
    if (this.saving.has(enrollmentId)) return;
    this.saving.add(enrollmentId);
    this.errorMessage = '';

    this.attendanceService
      .markAttendance({ enrollment_id: enrollmentId, date: this.today, status })
      .subscribe({
        next: (record) => {
          // Upsert in local records
          const idx = this.records.findIndex((r) => r.enrollment_id === enrollmentId);
          if (idx >= 0) {
            this.records[idx] = record;
          } else {
            this.records.push(record);
          }
          this.saving.delete(enrollmentId);
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to mark attendance.';
          this.saving.delete(enrollmentId);
          this.cdr.detectChanges();
        },
      });
  }

  /** Mark all unmarked students as Present (one tap) */
  markAllPresent(): void {
    const unmarkedIds = this.students
      .filter((s) => !this.getStatus(s.id))
      .map((s) => s.id);
    if (!unmarkedIds.length) return;

    this.saving = new Set(unmarkedIds);
    this.attendanceService
      .bulkMarkPresent(unmarkedIds)
      .subscribe({
        next: (newRecords) => {
          for (const rec of newRecords) {
            const idx = this.records.findIndex((r) => r.enrollment_id === rec.enrollment_id);
            if (idx >= 0) this.records[idx] = rec;
            else this.records.push(rec);
          }
          this.saving.clear();
          this.successMessage = `✅ ${newRecords.length} students marked present!`;
          setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 3000);
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Bulk marking failed.';
          this.saving.clear();
          this.cdr.detectChanges();
        },
      });
  }

  /** Broadcast "arrived safely" to all present students' parents */
  broadcastArrival(): void {
    if (this.broadcasting) return;
    this.broadcasting = true;
    this.errorMessage = '';

    this.attendanceService.broadcastArrival(this.selectedClassId, this.today).subscribe({
      next: (result) => {
        this.broadcasting = false;
        this.successMessage = `📣 ${result.notified} parent(s) notified!`;
        setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to send notifications.';
        this.broadcasting = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Stats getters */
  get presentCount(): number {
    return this.records.filter((r) => r.status === 'present').length;
  }

  get absentCount(): number {
    return this.records.filter((r) => r.status === 'absent').length;
  }

  get leaveCount(): number {
    return this.records.filter((r) => r.status === 'leave').length;
  }

  get unmarkedCount(): number {
    return this.students.length - this.records.length;
  }

  get allMarked(): boolean {
    return this.students.length > 0 && this.records.length >= this.students.length;
  }

  getInitials(student: EnrolledStudent): string {
    return (student.student.first_name?.[0] || '') + (student.student.last_name?.[0] || '');
  }

  getClassName(): string {
    const a = this.assignments.find((x) => x.class_id === this.selectedClassId);
    return a?.assignedClass?.name || 'Class';
  }

  isSaving(enrollmentId: string): boolean {
    return this.saving.has(enrollmentId);
  }
}
