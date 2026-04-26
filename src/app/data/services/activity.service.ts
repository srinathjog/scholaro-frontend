import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateActivityDto {
  class_id: string;
  section_id?: string;
  title: string;
  description?: string;
  activity_type: string;
  media_urls: string[];
  media_types?: string[];
  /** Target specific students. Omit or empty = class-wide post. */
  student_ids?: string[];
}

export interface Activity {
  id: string;
  tenant_id: string;
  class_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  activity_type: string;
  created_by: string;
  created_at: string;
  /** @deprecated use student_ids */
  student_id?: string | null;
  student_ids?: string[] | null;
  media: { id: string; media_url: string; media_type: string }[];
  assignedClass?: { id: string; name: string };
}

export interface AdminFeedActivity {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  created_at: string;
  created_by: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  media: { id: string; media_url: string; media_type: string }[];
}

export interface AdminFeedResponse {
  data: AdminFeedActivity[];
  meta: { totalItems: number; page: number; limit: number; hasNextPage: boolean };
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string | null;
  academic_year_id: string;
  assignedClass: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly apiUrl = environment.apiUrl;
  private _classesCache: TeacherAssignment[] | null = null;

  constructor(private http: HttpClient) {}

  postActivity(data: CreateActivityDto): Observable<Activity> {
    return this.http.post<Activity>(`${this.apiUrl}/activities`, data);
  }

  getFeed(classId: string): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/activities/feed`, {
      params: { class_id: classId },
    });
  }

  getClassesByTeacher(teacherId: string, forceRefresh = false): Observable<TeacherAssignment[]> {
    const fresh$ = this.http.get<TeacherAssignment[]>(
      `${this.apiUrl}/teacher-assignments/teacher/${teacherId}`
    ).pipe(tap(data => this._classesCache = data));

    if (this._classesCache && !forceRefresh) {
      // Return cache instantly, refresh in background for next time
      fresh$.subscribe();
      return of(this._classesCache);
    }

    return fresh$;
  }

  getTeacherActivities(userId: string): Observable<Activity[]> {
    return this.http.get<Activity[]>(
      `${this.apiUrl}/activities/teacher/${userId}`,
    );
  }

  getActivityById(id: string): Observable<Activity> {
    return this.http.get<Activity>(`${this.apiUrl}/activities/${id}`);
  }

  deleteActivity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/activities/${id}`);
  }

  updateActivity(id: string, data: Partial<{ title: string; description: string; class_id: string; section_id: string }>): Observable<Activity> {
    return this.http.patch<Activity>(`${this.apiUrl}/activities/${id}`, data);
  }

  /** Admin "God View" — all activities across all classes, with teacher name. */
  getAdminFeed(
    filters: { teacher_id?: string; class_id?: string } = {},
    page = 1,
    limit = 20,
  ): Observable<AdminFeedResponse> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (filters.teacher_id) params['teacher_id'] = filters.teacher_id;
    if (filters.class_id)   params['class_id']   = filters.class_id;
    return this.http.get<AdminFeedResponse>(`${this.apiUrl}/activities/admin-feed`, { params });
  }
}
