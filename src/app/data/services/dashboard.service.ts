import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ──

export interface SchoolStats {
  overview: {
    total_students: number;
    total_teachers: number;
    total_classes: number;
  };
  attendance: {
    today: string;
    total_enrolled: number;
    present_today: number;
    absent_today: number;
    attendance_percentage: number;
  };
  financials: {
    month: string;
    total_due: number;
    total_collected: number;
    collection_rate: number;
    overdue_count: number;
  };
  engagement: {
    activities_last_24h: number;
    photos_last_24h: number;
    active_teachers_last_24h: number;
  };
  alerts: {
    not_checked_out: number;
    students_not_checked_out: { student_name: string; class_name: string }[];
  };
}

export interface AttendanceChartPoint {
  date: string;
  present: number;
  absent: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<SchoolStats> {
    return this.http.get<SchoolStats>(`${this.api}/stats`);
  }

  getAttendanceChartData(): Observable<AttendanceChartPoint[]> {
    return this.http.get<AttendanceChartPoint[]>(`${this.api}/attendance-chart`);
  }
}
