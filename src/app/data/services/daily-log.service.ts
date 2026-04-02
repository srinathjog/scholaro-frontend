import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LogCategory = 'meal' | 'nap' | 'potty' | 'mood' | 'health';

export interface CreateDailyLogDto {
  enrollment_id: string;
  category: LogCategory;
  log_value: string;
  notes?: string;
}

export interface BulkDailyLogDto {
  enrollment_ids: string[];
  category: LogCategory;
  log_value: string;
  notes?: string;
}

export interface DailyLog {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  category: LogCategory;
  log_value: string;
  notes?: string;
  logged_by: string;
  created_at: string;
  enrollment?: {
    id: string;
    student_id: string;
    student?: {
      id: string;
      first_name: string;
      last_name: string;
    };
  };
}

export interface EnrolledStudent {
  id: string;           // enrollment_id
  student_id: string;
  class_id: string;
  section_id: string | null;
  roll_number: string;
  status: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class DailyLogService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Post a single daily log */
  postLog(dto: CreateDailyLogDto): Observable<DailyLog> {
    return this.http.post<DailyLog>(`${this.apiUrl}/daily-logs`, dto);
  }

  /** Post a bulk log for multiple students at once */
  postBulkLog(dto: BulkDailyLogDto): Observable<DailyLog[]> {
    return this.http.post<DailyLog[]>(`${this.apiUrl}/daily-logs/bulk`, dto);
  }

  /** Get enrolled students in a class (returns enrollment_id + student details) */
  getStudentsByClass(classId: string): Observable<EnrolledStudent[]> {
    return this.http.get<EnrolledStudent[]>(
      `${this.apiUrl}/enrollments/class/${classId}`,
    );
  }

  /** Get all logs for a class on a given date */
  getTodaysLogs(classId: string, date?: string): Observable<DailyLog[]> {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.http.get<DailyLog[]>(
      `${this.apiUrl}/daily-logs/class/${classId}`,
      { params: { date: d } },
    );
  }

  /** Get logs for a specific student on a given date */
  getStudentLogs(enrollmentId: string, date?: string): Observable<DailyLog[]> {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.http.get<DailyLog[]>(
      `${this.apiUrl}/daily-logs/student/${enrollmentId}`,
      { params: { date: d } },
    );
  }
}
