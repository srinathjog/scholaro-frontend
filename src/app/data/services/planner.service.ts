import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClassPlanner {
  id: string;
  class_id: string;
  section_id: string | null;
  file_url: string;
  file_type: 'pdf' | 'image';
  month: string;
  year: number;
  uploaded_by: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly url = `${environment.apiUrl}/planners`;

  constructor(private readonly http: HttpClient) {}

  /** Upload or replace the planner for a class/month/year. */
  upload(
    classId: string,
    sectionId: string | null,
    month: string,
    year: number,
    file: File,
  ): Observable<ClassPlanner> {
    const fd = new FormData();
    fd.append('class_id', classId);
    fd.append('month', month);
    fd.append('year', String(year));
    if (sectionId) fd.append('section_id', sectionId);
    fd.append('file', file, file.name);
    return this.http.post<ClassPlanner>(this.url, fd);
  }

  /** Get the planner for a class + month + year (returns null body if none). */
  getForClass(classId: string, month: string, year: number): Observable<ClassPlanner | null> {
    return this.http.get<ClassPlanner | null>(this.url, {
      params: { class_id: classId, month, year: String(year) },
    });
  }

  /** Get all planners for a class (teacher history view). */
  getHistoryForClass(classId: string): Observable<ClassPlanner[]> {
    return this.http.get<ClassPlanner[]>(`${this.url}/history`, {
      params: { class_id: classId },
    });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
