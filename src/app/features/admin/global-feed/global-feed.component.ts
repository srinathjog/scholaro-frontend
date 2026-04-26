import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  ActivityService,
  AdminFeedActivity,
} from '../../../data/services/activity.service';
import { AcademicService, SchoolClass } from '../../../data/services/academic.service';
import { environment } from '../../../../environments/environment';

interface TeacherOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-global-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-feed.component.html',
})
export class GlobalFeedComponent implements OnInit {
  // ── Data ──────────────────────────────────────────────────────────────────
  activities: AdminFeedActivity[] = [];
  teachers: TeacherOption[] = [];
  classes: SchoolClass[] = [];

  // ── Filters ───────────────────────────────────────────────────────────────
  filterTeacherId = '';
  filterClassId   = '';

  // ── Pagination ────────────────────────────────────────────────────────────
  page      = 1;
  limit     = 20;
  totalItems  = 0;
  hasNextPage = false;

  // ── UI state ──────────────────────────────────────────────────────────────
  loading      = false;
  loadingMore  = false;
  error        = '';

  /** Lightbox */
  lightboxUrl   = '';
  lightboxType  = '';
  lightboxOpen  = false;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private activityService: ActivityService,
    private academicService: AcademicService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    // Load filter options in parallel
    this.academicService.getClasses().subscribe({
      next: (cls) => { this.classes = cls; this.cdr.detectChanges(); },
    });

    this.http.get<TeacherOption[]>(`${environment.apiUrl}/users/staff`).subscribe({
      next: (staff) => {
        // staff rows have { id, name, roles } — filter to TEACHER role
        this.teachers = (staff as unknown as Array<{ id: string; name: string; roles: string }>)
          .filter(s => s.roles?.includes('TEACHER'))
          .map(s => ({ id: s.id, name: s.name }));
        this.cdr.detectChanges();
      },
      error: () => {}, // teachers filter is optional
    });

    this.loadFeed(true);
  }

  // ── Load / reload ─────────────────────────────────────────────────────────

  onFiltersChange(): void {
    this.page = 1;
    this.activities = [];
    this.loadFeed(true);
  }

  loadFeed(reset = false): void {
    if (reset) {
      this.loading = true;
      this.activities = [];
    } else {
      this.loadingMore = true;
    }
    this.error = '';

    const filters: { teacher_id?: string; class_id?: string } = {};
    if (this.filterTeacherId) filters.teacher_id = this.filterTeacherId;
    if (this.filterClassId)   filters.class_id   = this.filterClassId;

    this.activityService.getAdminFeed(filters, this.page, this.limit).subscribe({
      next: ({ data, meta }) => {
        this.activities = reset ? data : [...this.activities, ...data];
        this.totalItems  = meta.totalItems;
        this.hasNextPage = meta.hasNextPage;
        this.loading     = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error       = 'Failed to load activity feed. Please try again.';
        this.loading     = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMore(): void {
    if (!this.hasNextPage || this.loadingMore) return;
    this.page++;
    this.loadFeed(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get selectedTeacherName(): string {
    return this.teachers.find(t => t.id === this.filterTeacherId)?.name ?? '';
  }

  get selectedClassName(): string {
    return this.classes.find(c => c.id === this.filterClassId)?.name ?? '';
  }

  get activeFilterCount(): number {
    return (this.filterTeacherId ? 1 : 0) + (this.filterClassId ? 1 : 0);
  }

  clearFilters(): void {
    this.filterTeacherId = '';
    this.filterClassId   = '';
    this.onFiltersChange();
  }

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      moment:     'bg-violet-50 text-violet-700 border-violet-100',
      notice:     'bg-amber-50  text-amber-700  border-amber-100',
      curriculum: 'bg-blue-50   text-blue-700   border-blue-100',
    };
    return map[type] ?? 'bg-gray-50 text-gray-600 border-gray-100';
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      moment:     '📸 Moment',
      notice:     '📢 Notice',
      curriculum: '📖 Learning',
    };
    return map[type] ?? type;
  }

  teacherInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  /** Consistent avatar colour from teacher name */
  teacherColor(name: string): string {
    const colors = [
      'bg-indigo-500', 'bg-violet-500', 'bg-teal-500',
      'bg-pink-500',   'bg-orange-500', 'bg-cyan-500',
    ];
    const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────

  openLightbox(url: string, type: string): void {
    this.lightboxUrl  = url;
    this.lightboxType = type;
    this.lightboxOpen = true;
    this.cdr.detectChanges();
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }
}
