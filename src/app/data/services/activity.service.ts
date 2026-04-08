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
  media: { id: string; media_url: string; media_type: string }[];
  assignedClass?: { id: string; name: string };
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

  getClassesByTeacher(teacherId: string): Observable<TeacherAssignment[]> {
    const fresh$ = this.http.get<TeacherAssignment[]>(
      `${this.apiUrl}/teacher-assignments/teacher/${teacherId}`
    ).pipe(tap(data => this._classesCache = data));

    if (this._classesCache) {
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

  deleteActivity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/activities/${id}`);
  }
}
