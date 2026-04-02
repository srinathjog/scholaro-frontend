import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  DailyLogService,
  EnrolledStudent,
  DailyLog,
  LogCategory,
} from '../../../data/services/daily-log.service';
import {
  ActivityService,
  TeacherAssignment,
} from '../../../data/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';

interface QuickAction {
  category: LogCategory;
  value: string;
  label: string;
  icon: string;
  color: string;
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  meal: [
    { category: 'meal', value: 'finished', label: 'Finished', icon: '🍲', color: 'emerald' },
    { category: 'meal', value: 'half', label: 'Half', icon: '🥄', color: 'amber' },
    { category: 'meal', value: 'not_eaten', label: 'Not Eaten', icon: '🚫', color: 'red' },
  ],
  nap: [
    { category: 'nap', value: 'sleeping', label: 'Sleeping', icon: '😴', color: 'indigo' },
    { category: 'nap', value: 'awake', label: 'Awake', icon: '👀', color: 'amber' },
    { category: 'nap', value: '1hr_plus', label: '1 hr+', icon: '🕐', color: 'emerald' },
  ],
  potty: [
    { category: 'potty', value: 'wet', label: 'Wet', icon: '💧', color: 'amber' },
    { category: 'potty', value: 'dry', label: 'Dry', icon: '✅', color: 'emerald' },
    { category: 'potty', value: 'changed', label: 'Changed', icon: '🔄', color: 'indigo' },
  ],
  mood: [
    { category: 'mood', value: 'happy', label: 'Happy', icon: '😊', color: 'emerald' },
    { category: 'mood', value: 'fussy', label: 'Fussy', icon: '😢', color: 'red' },
    { category: 'mood', value: 'playful', label: 'Playful', icon: '🤸', color: 'indigo' },
  ],
};

const CATEGORY_TABS: { key: LogCategory; label: string; icon: string }[] = [
  { key: 'meal', label: 'Meal', icon: '�' },
  { key: 'nap', label: 'Nap', icon: '😴' },
  { key: 'potty', label: 'Potty', icon: '🚽' },
  { key: 'mood', label: 'Mood', icon: '😊' },
];

@Component({
  selector: 'app-daily-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-logs.component.html',
})
export class DailyLogsComponent implements OnInit {
  // Data
  assignments: TeacherAssignment[] = [];
  students: EnrolledStudent[] = [];
  todaysLogs: DailyLog[] = [];

  // UI state
  selectedClassId = '';
  selectedCategory: LogCategory = 'meal';
  selectedStudentIds = new Set<string>();
  selectAll = false;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';
  viewMode: 'log' | 'summary' = 'log';

  // Config
  categoryTabs = CATEGORY_TABS;
  quickActions = QUICK_ACTIONS;

  // Today's date formatted
  todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  constructor(
    private dailyLogService: DailyLogService,
    private activityService: ActivityService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService['currentUserSubject'].value;
    if (!user) return;

    this.activityService.getClassesByTeacher(user.userId).subscribe({
      next: (data) => {
        this.assignments = data;
        if (data.length === 1) {
          this.selectedClassId = data[0].class_id;
          this.onClassChange();
        }
      },
      error: () => (this.errorMessage = 'Could not load your classes.'),
    });
  }

  onClassChange(): void {
    if (!this.selectedClassId) {
      this.students = [];
      this.todaysLogs = [];
      return;
    }

    this.loading = true;
    this.selectedStudentIds.clear();
    this.selectAll = false;

    // Load students and today's logs in parallel
    forkJoin({
      students: this.dailyLogService.getStudentsByClass(this.selectedClassId),
      logs: this.dailyLogService.getTodaysLogs(this.selectedClassId),
    }).subscribe({
      next: ({ students, logs }) => {
        this.students = students;
        this.todaysLogs = logs;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load students.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleStudent(enrollmentId: string): void {
    if (this.selectedStudentIds.has(enrollmentId)) {
      this.selectedStudentIds.delete(enrollmentId);
    } else {
      this.selectedStudentIds.add(enrollmentId);
    }
    this.selectAll = this.selectedStudentIds.size === this.students.length;
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedStudentIds.clear();
      this.selectAll = false;
    } else {
      for (const s of this.students) {
        this.selectedStudentIds.add(s.id);
      }
      this.selectAll = true;
    }
  }

  isSelected(enrollmentId: string): boolean {
    return this.selectedStudentIds.has(enrollmentId);
  }

  handleQuickLog(action: QuickAction): void {
    if (this.selectedStudentIds.size === 0) {
      this.errorMessage = 'Select at least one student first.';
      setTimeout(() => (this.errorMessage = ''), 3000);
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const enrollmentIds = Array.from(this.selectedStudentIds);

    this.dailyLogService
      .postBulkLog({
        enrollment_ids: enrollmentIds,
        category: action.category,
        log_value: action.value,
      })
      .subscribe({
        next: (logs) => {
          this.todaysLogs.push(...logs);
          this.successMessage = `${action.icon} ${action.label} logged for ${enrollmentIds.length} student${enrollmentIds.length !== 1 ? 's' : ''}!`;
          this.selectedStudentIds.clear();
          this.selectAll = false;
          this.saving = false;
          setTimeout(() => (this.successMessage = ''), 4000);
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to save logs. Please try again.';
          this.saving = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Check if a student already has a log for the current category today */
  getStudentLogForCategory(enrollmentId: string): DailyLog | undefined {
    return this.todaysLogs.find(
      (l) => l.enrollment_id === enrollmentId && l.category === this.selectedCategory,
    );
  }

  get currentActions(): QuickAction[] {
    return this.quickActions[this.selectedCategory];
  }

  get selectedCount(): number {
    return this.selectedStudentIds.size;
  }

  getClassName(): string {
    const a = this.assignments.find((x) => x.class_id === this.selectedClassId);
    return a?.assignedClass?.name || 'Class';
  }

  /** Group today's logs by student for the summary view */
  get logsByStudent(): { name: string; enrollmentId: string; logs: DailyLog[] }[] {
    const map = new Map<string, { name: string; enrollmentId: string; logs: DailyLog[] }>();

    for (const log of this.todaysLogs) {
      if (!map.has(log.enrollment_id)) {
        // Try to find student name from enrollments we already loaded
        const student = this.students.find(s => s.id === log.enrollment_id);
        const name = student
          ? `${student.student.first_name} ${student.student.last_name}`
          : (log.enrollment?.student
              ? `${log.enrollment.student.first_name} ${log.enrollment.student.last_name}`
              : 'Unknown');
        map.set(log.enrollment_id, { name, enrollmentId: log.enrollment_id, logs: [] });
      }
      map.get(log.enrollment_id)!.logs.push(log);
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Get the icon for a category */
  getCategoryIcon(category: string): string {
    const tab = this.categoryTabs.find(t => t.key === category);
    return tab?.icon || '📝';
  }

  /** Get the icon for a specific log value */
  getLogIcon(category: string, value: string): string {
    const actions = this.quickActions[category];
    if (!actions) return '';
    const action = actions.find(a => a.value === value);
    return action?.icon || '';
  }

  /** Format log value for display */
  formatLogValue(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
