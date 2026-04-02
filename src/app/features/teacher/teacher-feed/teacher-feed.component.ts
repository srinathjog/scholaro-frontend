import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivityService, Activity } from '../../../data/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-teacher-feed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './teacher-feed.component.html',
})
export class TeacherFeedComponent implements OnInit {
  activities: Activity[] = [];
  loading = true;
  errorMessage = '';
  deletingId: string | null = null;

  private userId = '';
  private tenantId = '';

  constructor(
    private activityService: ActivityService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService['currentUserSubject'].value;
    if (!user) return;

    this.userId = user.userId;
    this.tenantId = user.tenantId;
    this.loadActivities();
  }

  loadActivities(): void {
    this.loading = true;
    this.errorMessage = '';
    this.activityService.getTeacherActivities(this.userId).subscribe({
      next: (data) => {
        this.activities = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[TeacherFeed] API error:', err);
        this.errorMessage = 'Could not load your posts. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteActivity(id: string): void {
    if (!confirm('Delete this post? Parents will no longer see it.')) return;

    this.deletingId = id;
    this.activityService.deleteActivity(id).subscribe({
      next: () => {
        this.activities = this.activities.filter((a) => a.id !== id);
        this.deletingId = null;
      },
      error: () => {
        this.errorMessage = 'Failed to delete post. Please try again.';
        this.deletingId = null;
      },
    });
  }

  timeAgo(dateStr: string): string {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
}
