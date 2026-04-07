import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, shareReplay, tap, concat, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Activity } from './activity.service';
import { DailyLog, LogCategory } from './daily-log.service';
import { AttendanceRecord } from './attendance.service';

/** Unified timeline item — activity, daily log, or security check-in/out */
export interface TimelineItem {
  type: 'activity' | 'daily_log' | 'security';
  id: string;
  created_at: string;

  // Activity fields (present when type === 'activity')
  title?: string;
  description?: string | null;
  activity_type?: string;
  media?: { id: string; media_url: string; media_type: string }[];
  className?: string;

  // Daily-log fields (present when type === 'daily_log')
  category?: LogCategory;
  log_value?: string;
  notes?: string | null;

  // Security fields (present when type === 'security')
  security_event?: 'check_in' | 'check_out';
  check_in_time?: string;
  check_out_time?: string;
  pickup_by_name?: string;
  status?: string;

  // Attendance enrichment (present when type === 'activity')
  is_present?: boolean;
}

/** A child with active enrollments as returned by the parent API */
export interface ParentChild {
  id: string;
  first_name: string;
  last_name: string;
  enrollments: {
    id: string;          // enrollment_id
    class_id: string;
    section_id: string | null;
    roll_number: string;
    className: string | null;
  }[];
}

/** Result from timeline fetch, includes pagination info for activities */
export interface TimelineResult {
  items: TimelineItem[];
  hasNextPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class ParentService {
  private readonly apiUrl = environment.apiUrl;

  // ── In-memory caches (stale-while-revalidate) ──
  private childrenData: ParentChild[] | null = null;
  private children$: Observable<ParentChild[]> | null = null;
  private timelineData = new Map<string, TimelineItem[]>();
  private feesData = new Map<string, { fees: any[]; summary: any }>();

  constructor(private http: HttpClient) {}

  /**
   * Get children — instant from cache, background-refresh for next visit.
   * First call fetches from API; subsequent calls return cached data immediately
   * and silently refresh in the background.
   */
  getMyChildren(): Observable<ParentChild[]> {
    // If we have cached data, return it instantly + refresh in background
    if (this.childrenData) {
      const cached$ = of(this.childrenData);
      // Background refresh (won't block the UI)
      this.fetchChildren$().subscribe();
      return cached$;
    }

    // First load — fetch and cache
    if (!this.children$) {
      this.children$ = this.fetchChildren$().pipe(shareReplay(1));
    }
    return this.children$;
  }

  private fetchChildren$(): Observable<ParentChild[]> {
    return this.http
      .get<ParentChild[]>(`${this.apiUrl}/parents/me/children`)
      .pipe(tap((data) => { this.childrenData = data; this.children$ = null; }));
  }

  /** Get fees — instant from cache, background-refresh */
  getStudentFees(studentId: string): Observable<{ fees: any[]; summary: any }> {
    const cached = this.feesData.get(studentId);
    if (cached) {
      // Return cached + background refresh
      this.http.get<any>(`${this.apiUrl}/parents/student/${studentId}/fees`)
        .subscribe((fresh) => this.feesData.set(studentId, fresh));
      return of(cached);
    }
    return this.http.get<any>(`${this.apiUrl}/parents/student/${studentId}/fees`)
      .pipe(tap((data) => this.feesData.set(studentId, data)));
  }

  /** Clear all caches (call on logout) */
  clearCache(): void {
    this.childrenData = null;
    this.children$ = null;
    this.timelineData.clear();
    this.feesData.clear();
  }

  /**
   * Fetch a unified parent timeline combining:
   *  1. Class activity broadcasts (photos/videos)
   *  2. Child's personal daily logs (meal/nap/potty/mood)
   *  3. Attendance security events (check-in / check-out)
   *
   * Results are merged into a single array sorted by created_at descending (newest first).
   * TenantInterceptor auto-attaches x-tenant-id header.
   */
  getTimeline(
    enrollmentId: string,
    classId: string,
    date?: string,
    studentId?: string,
  ): Observable<TimelineResult> {
    const d = date || new Date().toISOString().slice(0, 10);
    const cacheKey = `${enrollmentId}_${classId}_${d}_${studentId || ''}`;
    const cached = this.timelineData.get(cacheKey);

    const fresh$ = this.fetchTimeline$(enrollmentId, classId, d, studentId, cacheKey);

    if (cached) {
      // Return cached instantly, refresh in background for next visit
      fresh$.subscribe();
      return of({ items: cached, hasNextPage: false });
    }

    return fresh$;
  }

  /** Force-refresh timeline (pull-to-refresh) — bypasses cache */
  refreshTimeline(
    enrollmentId: string,
    classId: string,
    date?: string,
    studentId?: string,
  ): Observable<TimelineResult> {
    const d = date || new Date().toISOString().slice(0, 10);
    const cacheKey = `${enrollmentId}_${classId}_${d}_${studentId || ''}`;
    return this.fetchTimeline$(enrollmentId, classId, d, studentId, cacheKey);
  }

  private fetchTimeline$(
    enrollmentId: string,
    classId: string,
    date: string,
    studentId: string | undefined,
    cacheKey: string,
  ): Observable<TimelineResult> {

    const sources: any = {
      activities: this.http.get<any>(`${this.apiUrl}/activities/feed`, {
        params: { class_id: classId, ...(enrollmentId ? { enrollment_id: enrollmentId } : {}), page: '1', limit: '10' },
      }),
      logs: this.http.get<DailyLog[]>(
        `${this.apiUrl}/daily-logs/student/${enrollmentId}`,
        { params: { date } },
      ),
    };

    // Add attendance fetch if studentId is available (catch errors so timeline still loads)
    if (studentId) {
      sources.attendance = this.http.get<AttendanceRecord[]>(
        `${this.apiUrl}/parents/student/${studentId}/attendance`,
        { params: { date } },
      ).pipe(catchError(() => of([] as AttendanceRecord[])));
    }

    return forkJoin(sources).pipe(
      map((results: any) => {
        const activitiesRaw = results.activities;
        const activityList = activitiesRaw?.data ?? activitiesRaw;
        const hasNextPage = activitiesRaw?.meta?.hasNextPage ?? false;
        const { logs, attendance } = results;
        const activityItems: TimelineItem[] = (activityList as Activity[]).map((a: any) => ({
          type: 'activity' as const,
          id: a.id,
          created_at: a.created_at,
          title: a.title,
          description: a.description,
          activity_type: a.activity_type,
          media: a.media,
          className: a.assignedClass?.name,
          is_present: a.is_present,
        }));

        const logItems: TimelineItem[] = (logs as DailyLog[]).map((l) => ({
          type: 'daily_log' as const,
          id: l.id,
          created_at: l.created_at,
          category: l.category,
          log_value: l.log_value,
          notes: l.notes,
        }));

        // Build security cards from attendance records
        const securityItems: TimelineItem[] = [];
        if (attendance) {
          for (const rec of attendance as AttendanceRecord[]) {
            // Check-in event
            if (rec.check_in_time && (rec.status === 'present' || rec.status === 'late')) {
              securityItems.push({
                type: 'security',
                id: `${rec.id}-in`,
                created_at: rec.check_in_time,
                security_event: 'check_in',
                check_in_time: rec.check_in_time,
                status: rec.status,
              });
            }
            // Check-out event
            if (rec.check_out_time) {
              securityItems.push({
                type: 'security',
                id: `${rec.id}-out`,
                created_at: rec.check_out_time,
                security_event: 'check_out',
                check_out_time: rec.check_out_time,
                pickup_by_name: rec.pickup_by_name,
              });
            }
          }
        }

        // Merge & sort newest-first
        const items = [...activityItems, ...logItems, ...securityItems].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        return { items, hasNextPage } as TimelineResult;
      }),
      tap((result) => this.timelineData.set(cacheKey, result.items)),
    );
  }

  /** Fetch next page of activities for infinite scroll */
  getNextActivityPage(
    classId: string,
    enrollmentId: string,
    page: number,
    limit = 10,
  ): Observable<{ items: TimelineItem[]; hasNextPage: boolean }> {
    return this.http.get<any>(`${this.apiUrl}/activities/feed`, {
      params: {
        class_id: classId,
        ...(enrollmentId ? { enrollment_id: enrollmentId } : {}),
        page: String(page),
        limit: String(limit),
      },
    }).pipe(
      map((res: any) => {
        const data = res.data ?? res;
        const hasNextPage = res.meta?.hasNextPage ?? false;
        const items: TimelineItem[] = (data as Activity[]).map((a: any) => ({
          type: 'activity' as const,
          id: a.id,
          created_at: a.created_at,
          title: a.title,
          description: a.description,
          activity_type: a.activity_type,
          media: a.media,
          className: a.assignedClass?.name,
          is_present: a.is_present,
        }));
        return { items, hasNextPage };
      }),
    );
  }
}
