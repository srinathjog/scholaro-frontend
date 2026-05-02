import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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
  menuOpenId: string | null = null;

  private userId = '';
  private tenantId = '';

  constructor(
    private activityService: ActivityService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
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
    this.deletingId = id;
    this.activityService.deleteActivity(id).subscribe({
      next: () => {
        this.activities = this.activities.filter(activity => activity.id !== id);
        this.toastMessage = '✅ Post removed.';
        this.showToast = true;
        setTimeout(() => {
          this.showToast = false;
          this.cdr.detectChanges();
        }, 3000);
        this.deletingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to delete post. Please try again.';
        this.deletingId = null;
        this.cdr.detectChanges();
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

  openMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpenId = id;
  }

  closeMenu(): void {
    this.menuOpenId = null;
  }

  editActivity(id: string): void {
    this.router.navigate(['/teacher/edit', id]);
    this.closeMenu();
  }

  // Add this to close menu on outside click
  ngAfterViewInit(): void {
    window.addEventListener('click', () => this.closeMenu());
  }

  showToast = false;
  toastMessage = '';

  // ── Lightbox ───────────────────────────────────────────────────────────
  /** All image URLs for the activity currently open in the lightbox. */
  lightboxImages: string[] = [];
  /** Index of the currently displayed image. */
  lightboxIndex = 0;
  /** Controls fade opacity during prev/next navigation. */
  lightboxImageVisible = true;

  get selectedImageUrl(): string | null {
    return this.lightboxImages.length > 0 ? this.lightboxImages[this.lightboxIndex] : null;
  }

  openLightboxForActivity(activity: Activity, clickedUrl: string): void {
    const images = (activity.media || [])
      .filter((m: any) => m.media_type !== 'video')
      .map((m: any) => m.media_url as string);
    const idx = images.indexOf(clickedUrl);
    this.lightboxImages = images;
    this.lightboxIndex = idx >= 0 ? idx : 0;
    this.lightboxImageVisible = true;
    this.cdr.detectChanges();
  }

  closeLightbox(): void {
    this.lightboxImages = [];
    this.lightboxIndex = 0;
    this.cdr.detectChanges();
  }

  lightboxPrev(): void {
    if (this.lightboxIndex > 0 && this.lightboxImageVisible) {
      this.lightboxImageVisible = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.lightboxIndex--;
        this.lightboxImageVisible = true;
        this.cdr.detectChanges();
      }, 160);
    }
  }

  lightboxNext(): void {
    if (this.lightboxIndex < this.lightboxImages.length - 1 && this.lightboxImageVisible) {
      this.lightboxImageVisible = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.lightboxIndex++;
        this.lightboxImageVisible = true;
        this.cdr.detectChanges();
      }, 160);
    }
  }
}
