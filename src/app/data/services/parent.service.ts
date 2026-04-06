import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class ParentService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Get the logged-in parent's children with their enrollments + class names */
  getMyChildren(): Observable<ParentChild[]> {
    return this.http.get<ParentChild[]>(`${this.apiUrl}/parents/me/children`);
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
  ): Observable<TimelineItem[]> {
    const d = date || new Date().toISOString().slice(0, 10);

    const sources: any = {
      activities: this.http.get<Activity[]>(`${this.apiUrl}/activities/feed`, {
        params: { class_id: classId, ...(enrollmentId ? { enrollment_id: enrollmentId } : {}) },
      }),
      logs: this.http.get<DailyLog[]>(
        `${this.apiUrl}/daily-logs/student/${enrollmentId}`,
        { params: { date: d } },
      ),
    };

    // Add attendance fetch if studentId is available (catch errors so timeline still loads)
    if (studentId) {
      sources.attendance = this.http.get<AttendanceRecord[]>(
        `${this.apiUrl}/parents/student/${studentId}/attendance`,
        { params: { date: d } },
      ).pipe(catchError(() => of([] as AttendanceRecord[])));
    }

    return forkJoin(sources).pipe(
      map((results: any) => {
        const { activities, logs, attendance } = results;
        const activityItems: TimelineItem[] = (activities as Activity[]).map((a: any) => ({
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
        return [...activityItems, ...logItems, ...securityItems].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      }),
    );
  }
}
