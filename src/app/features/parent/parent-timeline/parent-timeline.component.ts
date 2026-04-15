import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ParentService,
  ParentChild,
  TimelineItem,
} from '../../../data/services/parent.service';
import { AuthService } from '../../../core/services/auth.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { todayLocal } from '../../../utils/date.util';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-parent-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TimeAgoPipe],
  templateUrl: './parent-timeline.component.html',
})
export class ParentTimelineComponent implements OnInit, OnDestroy, AfterViewInit {
  // Data
  children: ParentChild[] = [];
  timeline: TimelineItem[] = [];

  // Selected child state
  selectedChild: ParentChild | null = null;
  selectedEnrollmentId = '';
  selectedClassId = '';

  // Date navigation
  selectedDate = todayLocal(); // YYYY-MM-DD

  // UI state
  loading = false;
  loadingChildren = true;
  refreshing = false;
  errorMessage = '';
  showFirstLoginBanner = false;

  // Infinite scroll state
  currentPage = 1;
  hasNextPage = false;
  loadingMore = false;
  private scrollObserver: IntersectionObserver | null = null;
  private pushSub?: Subscription;
  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef<HTMLDivElement>;

  // Pull-to-refresh state
  pullDistance = 0;
  pullRefreshing = false;
  private touchStartY = 0;
  private readonly PULL_THRESHOLD = 80;

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
    // Check if parent is on first login (temporary password)
    const user = this.authService.currentUser$;
    user.subscribe(u => {
      if (u?.isFirstLogin) {
        this.showFirstLoginBanner = true;
        this.cdr.detectChanges();
      }
    });

    this.loadChildren();
    // Register for push notifications (fire-and-forget)
    this.pushService.subscribe().catch(() => {});

    // Auto-refresh timeline when a foreground push arrives
    this.pushSub = this.pushService.onMessage$.subscribe(() => {
      if (this.selectedEnrollmentId && this.selectedClassId && this.isToday) {
        console.log('[Timeline] Foreground push received — auto-refreshing');
        this.parentService
          .refreshTimeline(this.selectedEnrollmentId, this.selectedClassId, this.selectedDate, this.selectedChild?.id)
          .subscribe({
            next: (result) => {
              this.timeline = result.items;
              this.hasNextPage = result.hasNextPage;
              this.currentPage = 1;
              this.cdr.detectChanges();
            },
          });
      }
    });
  }

  dismissBanner(): void {
    this.showFirstLoginBanner = false;
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.setupScrollObserver();
  }

  // ── Pull-to-refresh touch handlers ──
  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if (window.scrollY === 0 && !this.pullRefreshing) {
      this.touchStartY = e.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (!this.touchStartY || this.pullRefreshing) return;
    if (window.scrollY > 0) { this.touchStartY = 0; this.pullDistance = 0; return; }
    const delta = e.touches[0].clientY - this.touchStartY;
    if (delta > 0) {
      this.pullDistance = Math.min(delta * 0.4, 120);
      this.cdr.detectChanges();
    }
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    if (this.pullDistance >= this.PULL_THRESHOLD && !this.pullRefreshing) {
      this.pullRefreshing = true;
      this.pullDistance = 60;
      this.cdr.detectChanges();
      this.doPullRefresh();
    } else {
      this.pullDistance = 0;
      this.cdr.detectChanges();
    }
    this.touchStartY = 0;
  }

  private doPullRefresh(): void {
    if (!this.selectedEnrollmentId || !this.selectedClassId) {
      this.pullRefreshing = false;
      this.pullDistance = 0;
      this.cdr.detectChanges();
      return;
    }
    this.parentService
      .refreshTimeline(this.selectedEnrollmentId, this.selectedClassId, this.selectedDate, this.selectedChild?.id)
      .subscribe({
        next: (result) => {
          this.timeline = result.items;
          this.hasNextPage = result.hasNextPage;
          this.currentPage = 1;
          this.pullRefreshing = false;
          this.pullDistance = 0;
          this.cdr.detectChanges();
          this.setupScrollObserver();
        },
        error: () => {
          this.pullRefreshing = false;
          this.pullDistance = 0;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
    this.pushSub?.unsubscribe();
  }

  /** Wire IntersectionObserver to the sentinel div at the bottom of the feed */
  private setupScrollObserver(): void {
    this.scrollObserver?.disconnect();
    // Wait one tick for the sentinel to render
    setTimeout(() => {
      const el = this.scrollSentinel?.nativeElement;
      if (!el) return;
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) this.loadMoreActivities();
        },
        { rootMargin: '200px' },
      );
      this.scrollObserver.observe(el);
    });
  }

  /** Fetch next page of activities and append to timeline */
  loadMoreActivities(): void {
    if (this.loadingMore || !this.hasNextPage) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;

    this.parentService
      .getNextActivityPage(this.selectedClassId, this.selectedEnrollmentId, nextPage)
      .subscribe({
        next: ({ items, hasNextPage }) => {
          this.timeline = [...this.timeline, ...items];
          this.currentPage = nextPage;
          this.hasNextPage = hasNextPage;
          this.loadingMore = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingMore = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Step 1: Load parent's children with enrollments */
  private loadChildren(): void {
    this.loadingChildren = this.children.length === 0;
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

    this.loading = this.timeline.length === 0;
    this.errorMessage = '';
    this.currentPage = 1;
    this.hasNextPage = false;

    this.parentService
      .getTimeline(this.selectedEnrollmentId, this.selectedClassId, this.selectedDate, this.selectedChild?.id)
      .subscribe({
        next: (result) => {
          this.timeline = result.items;
          this.hasNextPage = result.hasNextPage;
          this.loading = false;
          this.refreshing = false;
          this.cdr.detectChanges();
          this.setupScrollObserver();
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
    if (!this.selectedEnrollmentId || !this.selectedClassId) return;
    this.parentService
      .refreshTimeline(this.selectedEnrollmentId, this.selectedClassId, this.selectedDate, this.selectedChild?.id)
      .subscribe({
        next: (result) => {
          this.timeline = result.items;
          this.hasNextPage = result.hasNextPage;
          this.currentPage = 1;
          this.refreshing = false;
          this.cdr.detectChanges();
          this.setupScrollObserver();
        },
        error: () => {
          this.refreshing = false;
          this.cdr.detectChanges();
        },
      });
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
    const today = todayLocal();
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
    return this.selectedDate === todayLocal();
  }

  /** Format selected date for display */
  get displayDate(): string {
    const d = new Date(this.selectedDate + 'T00:00:00');
    if (this.isToday) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (this.selectedDate === yStr) return 'Yesterday';
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

  /** trackBy functions for *ngFor performance */
  trackChild(_: number, child: ParentChild): string { return child.id; }
  trackTimelineItem(_: number, item: TimelineItem): string { return item.id || `${item.type}-${item.created_at}`; }
  trackMedia(_: number, m: any): string { return m.media_url || m.id; }

  /** Get child's initials */
  getInitials(child: ParentChild): string {
    return (child.first_name?.[0] || '') + (child.last_name?.[0] || '');
  }

  /** Jump back to today */
  jumpToToday(): void {
    this.selectedDate = todayLocal();
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

    // If child was absent, show away message
    if (this.isChildAbsent) {
      return `${name} was away today. Here's what the class did! 🏠`;
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

  /** Check if child was absent (all activities marked absent, no check-in) */
  get isChildAbsent(): boolean {
    const activities = this.timeline.filter(i => i.type === 'activity');
    return activities.length > 0
      && activities.every(a => a.is_present === false)
      && !this.isCheckedIn;
  }

  /** Check if child has been checked in today */
  get isCheckedIn(): boolean {
    return this.timeline.some(i => i.type === 'security' && i.security_event === 'check_in');
  }

  /** Check if child has been checked out today */
  get isCheckedOut(): boolean {
    return this.timeline.some(i => i.type === 'security' && i.security_event === 'check_out');
  }

  /** Smart title for activity cards based on type + attendance (returns safe HTML) */
  formatActivityTitle(item: TimelineItem): string {
    const name = this.selectedChild?.first_name || 'Your child';
    const title = item.title || 'an activity';
    const boldName = `<span class="text-orange-600 font-bold">${name}</span>`;
    const boldTitle = `<span class="text-gray-900 font-bold">${title}</span>`;
    const className = item.className || this.currentClassName;

    // Notices/announcements are class-wide — never personalized
    if (item.activity_type === 'notice') {
      return `📢 ${boldTitle}`;
    }

    // Curriculum updates are about the class learning
    if (item.activity_type === 'curriculum') {
      if (item.is_present === false) {
        return `${className} learned about ${boldTitle}. ${boldName} can catch up! 📖`;
      }
      return `${boldName}'s class explored ${boldTitle} 📖`;
    }

    // Moments & default — attendance-aware
    if (item.is_present === false) {
      return `${className} had fun with ${boldTitle}. We missed ${boldName} today! ❤️`;
    }
    return `${boldName} was part of: ${boldTitle} 🌟`;
  }

  /** Context-aware header label + icon for activity cards */
  getActivityHeader(item: TimelineItem): { label: string; icon: string } {
    if (item.is_present === false) {
      return { label: 'While You Were Away', icon: '🏠' };
    }
    if (item.activity_type === 'moment') {
      return { label: 'Classroom Moment', icon: '📸' };
    }
    if (item.activity_type === 'notice') {
      return { label: 'School Notice', icon: '📢' };
    }
    if (item.activity_type === 'curriculum') {
      return { label: 'Learning Highlight', icon: '📖' };
    }
    return { label: 'Daily Highlight', icon: '✨' };
  }

  /** Tailwind classes for the attendance status badge */
  getStatusConfig(item: TimelineItem): { text: string; bg: string; dot: string; label: string } {
    if (item.is_present) {
      return { text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400', label: 'Present' };
    }
    return { text: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-400', label: 'Absent' };
  }
}
