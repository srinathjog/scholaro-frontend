import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ParentService,
  ParentChild,
  TimelineItem,
} from '../../../data/services/parent.service';
import { AuthService } from '../../../core/services/auth.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';

@Component({
  selector: 'app-parent-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parent-timeline.component.html',
})
export class ParentTimelineComponent implements OnInit {
  // Data
  children: ParentChild[] = [];
  timeline: TimelineItem[] = [];

  // Selected child state
  selectedChild: ParentChild | null = null;
  selectedEnrollmentId = '';
  selectedClassId = '';

  // Date navigation
  selectedDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // UI state
  loading = false;
  loadingChildren = true;
  refreshing = false;
  errorMessage = '';

  // Category display config
  categoryConfig: Record<string, { icon: string; label: string; color: string; bg: string; sentence: Record<string, string> }> = {
    meal: {
      icon: '🍲', label: 'Meal', color: 'amber', bg: 'bg-amber-50',
      sentence: { finished: 'finished the entire meal!', half: 'ate half the meal.', not_eaten: 'didn\'t eat today.', skipped: 'skipped the meal.' },
    },
    nap: {
      icon: '😴', label: 'Nap', color: 'indigo', bg: 'bg-indigo-50',
      sentence: { sleeping: 'is sleeping peacefully.', awake: 'stayed awake during nap time.', '1hr_plus': 'napped for over an hour!', slept_well: 'slept really well!', short_nap: 'had a short nap.', no_nap: 'didn\'t nap today.' },
    },
    potty: {
      icon: '🚽', label: 'Potty', color: 'cyan', bg: 'bg-cyan-50',
      sentence: { wet: 'had a wet diaper.', dry: 'stayed dry — great job!', changed: 'was changed.', normal: 'had a normal potty break.', accident: 'had a small accident.' },
    },
    mood: {
      icon: '😊', label: 'Mood', color: 'pink', bg: 'bg-pink-50',
      sentence: { happy: 'is having a great time! 🎉', fussy: 'was a little fussy.', playful: 'is feeling super playful!', quiet: 'was quiet today.', cranky: 'was a bit cranky.' },
    },
    health: {
      icon: '💪', label: 'Health', color: 'emerald', bg: 'bg-emerald-50',
      sentence: { fine: 'is feeling healthy!', mild_fever: 'has a mild fever.', sick: 'is feeling under the weather.' },
    },
  };

  constructor(
    private parentService: ParentService,
    private authService: AuthService,
    private pushService: PushNotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadChildren();
    // Register for push notifications (fire-and-forget)
    this.pushService.subscribe().catch(() => {});
  }

  /** Step 1: Load parent's children with enrollments */
  private loadChildren(): void {
    this.loadingChildren = true;
    this.parentService.getMyChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.loadingChildren = false;

        // Auto-select if only one child with one enrollment
        if (children.length === 1) {
          this.selectChild(children[0]);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load your children.';
        this.loadingChildren = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Select a child and their first enrollment, then load timeline */
  selectChild(child: ParentChild): void {
    this.selectedChild = child;
    if (child.enrollments.length > 0) {
      const enrollment = child.enrollments[0];
      this.selectedEnrollmentId = enrollment.id;
      this.selectedClassId = enrollment.class_id;
      this.loadTimeline();
    }
  }

  /** Switch enrollment (if child has multiple classes) */
  onEnrollmentChange(): void {
    const enrollment = this.selectedChild?.enrollments.find(
      (e) => e.id === this.selectedEnrollmentId,
    );
    if (enrollment) {
      this.selectedClassId = enrollment.class_id;
      this.loadTimeline();
    }
  }

  /** Load the unified timeline from ParentService */
  loadTimeline(): void {
    if (!this.selectedEnrollmentId || !this.selectedClassId) return;

    this.loading = true;
    this.errorMessage = '';

    this.parentService
      .getTimeline(this.selectedEnrollmentId, this.selectedClassId, this.selectedDate, this.selectedChild?.id)
      .subscribe({
        next: (items) => {
          this.timeline = items;
          this.loading = false;
          this.refreshing = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Could not load timeline. Pull down to retry.';
          this.loading = false;
          this.refreshing = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Pull-to-refresh handler */
  refresh(): void {
    this.refreshing = true;
    this.loadTimeline();
  }

  /** Navigate to previous day */
  previousDay(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() - 1);
    this.selectedDate = d.toISOString().slice(0, 10);
    this.loadTimeline();
  }

  /** Navigate to next day */
  nextDay(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().slice(0, 10);
    if (d.toISOString().slice(0, 10) <= today) {
      this.selectedDate = d.toISOString().slice(0, 10);
      this.loadTimeline();
    }
  }

  /** Jump to a specific date via the date picker */
  onDateChange(): void {
    this.loadTimeline();
  }

  /** Check if selected date is today */
  get isToday(): boolean {
    return this.selectedDate === new Date().toISOString().slice(0, 10);
  }

  /** Format selected date for display */
  get displayDate(): string {
    const d = new Date(this.selectedDate + 'T00:00:00');
    if (this.isToday) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (this.selectedDate === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  /** Format log value for display */
  formatLogValue(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Get child's initials */
  getInitials(child: ParentChild): string {
    return (child.first_name?.[0] || '') + (child.last_name?.[0] || '');
  }

  /** Jump back to today */
  jumpToToday(): void {
    this.selectedDate = new Date().toISOString().slice(0, 10);
    this.loadTimeline();
  }

  /** Build a natural-language sentence for a log item */
  getLogSentence(item: TimelineItem): string {
    const name = this.selectedChild?.first_name || 'Your child';
    const cat = item.category || '';
    const val = item.log_value || '';
    const config = this.categoryConfig[cat];
    if (config?.sentence?.[val]) {
      return `${name} ${config.sentence[val]}`;
    }
    return `${name} — ${this.formatLogValue(val)}`;
  }

  /** Determine a daily status message from today's mood/meal logs */
  get dailyStatus(): string {
    const name = this.selectedChild?.first_name || 'Your child';
    if (!this.timeline.length) return '';

    // Security status takes priority on today
    if (this.isToday) {
      if (this.isCheckedOut) return `${name} has been picked up safely! 🤝`;
      if (this.isCheckedIn) return `${name} is at school — safe and sound! 🛡️`;
    }

    // Check for mood logs first
    const moodLog = this.timeline.find(i => i.type === 'daily_log' && i.category === 'mood');
    if (moodLog) {
      const val = moodLog.log_value || '';
      if (val === 'happy' || val === 'playful') return `${name} is having a great day! 🌟`;
      if (val === 'fussy' || val === 'cranky') return `${name} is a little fussy today 💛`;
      if (val === 'quiet') return `${name} is having a quiet day 🤫`;
    }

    // Fallback to meal
    const mealLog = this.timeline.find(i => i.type === 'daily_log' && i.category === 'meal');
    if (mealLog?.log_value === 'finished') return `${name} ate well today! 🍽️`;
    if (mealLog?.log_value === 'not_eaten') return `${name} skipped a meal 🥺`;

    // Fall back to activity count
    const actCount = this.timeline.filter(i => i.type === 'activity').length;
    if (actCount > 0) return `${name} had ${actCount} activit${actCount > 1 ? 'ies' : 'y'} today! 📸`;

    return `${name}'s day is underway ☀️`;
  }

  /** Get current class name */
  get currentClassName(): string {
    const enrollment = this.selectedChild?.enrollments.find(e => e.id === this.selectedEnrollmentId);
    return enrollment?.className || 'Class';
  }

  /** Count logs by category for the quick-stat bubbles */
  get logStats(): { icon: string; label: string; count: number; color: string }[] {
    const stats: { icon: string; label: string; count: number; color: string }[] = [];
    for (const [key, config] of Object.entries(this.categoryConfig)) {
      const count = this.timeline.filter(i => i.type === 'daily_log' && i.category === key).length;
      if (count > 0) {
        stats.push({ icon: config.icon, label: config.label, count, color: config.color });
      }
    }
    return stats;
  }

  /** Build the security card sentence */
  getSecuritySentence(item: TimelineItem): string {
    const name = this.selectedChild?.first_name || 'Your child';
    if (item.security_event === 'check_in') {
      const time = item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
      const late = item.status === 'late' ? ' (a bit late)' : '';
      return `${name} arrived safely at ${time}${late}. 🏫`;
    }
    if (item.security_event === 'check_out') {
      const time = item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
      const by = item.pickup_by_name ? ` by ${item.pickup_by_name}` : '';
      return `${name} was picked up${by} at ${time}. 👋`;
    }
    return '';
  }

  /** Check if child has been checked in today */
  get isCheckedIn(): boolean {
    return this.timeline.some(i => i.type === 'security' && i.security_event === 'check_in');
  }

  /** Check if child has been checked out today */
  get isCheckedOut(): boolean {
    return this.timeline.some(i => i.type === 'security' && i.security_event === 'check_out');
  }
}
