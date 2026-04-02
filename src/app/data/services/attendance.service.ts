import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── DTOs ──

export interface MarkAttendanceDto {
  enrollment_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
}

export interface BulkAttendanceDto {
  enrollment_ids: string[];
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
}

export interface CheckoutDto {
  pickup_by_name: string;
  pickup_by_photo_url?: string;
  pickup_notes?: string;
}

// ── Response types ──

export interface DailyReportSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  checkedOut: number;
  total: number;
}

export interface DailyReport {
  date: string;
  summary: DailyReportSummary;
  present: AttendanceRecord[];
  absent: AttendanceRecord[];
  checkedOut: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  marked_by: string;
  created_at: string;
  check_in_time?: string;
  check_out_time?: string;
  pickup_by_name?: string;
  pickup_by_photo_url?: string;
  pickup_notes?: string;
  checkout_by?: string;
  enrollment?: {
    id: string;
    student_id: string;
    class_id: string;
    student?: {
      id: string;
      first_name: string;
      last_name: string;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Morning Check-in ──

  /** Mark a single student's attendance (present / absent / leave) */
  markAttendance(dto: MarkAttendanceDto): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(
      `${this.apiUrl}/attendance`,
      dto,
    );
  }

  /** Bulk-mark attendance for multiple students at once */
  markBulkAttendance(dto: BulkAttendanceDto): Observable<AttendanceRecord[]> {
    return this.http.post<AttendanceRecord[]>(
      `${this.apiUrl}/attendance/bulk`,
      dto,
    );
  }

  /** One-tap: mark all given enrollment IDs as Present for today */
  bulkMarkPresent(enrollmentIds: string[]): Observable<AttendanceRecord[]> {
    return this.http.post<AttendanceRecord[]>(
      `${this.apiUrl}/attendance/bulk-present`,
      { enrollment_ids: enrollmentIds },
    );
  }

  // ── Queries ──

  /** Structured daily report: present / absent / checkedOut buckets + summary */
  getDailyReport(classId: string, date?: string): Observable<DailyReport> {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.http.get<DailyReport>(
      `${this.apiUrl}/attendance/report/${classId}`,
      { params: { date: d } },
    );
  }

  /** Get all attendance records for a class on a given date */
  getAttendanceByClass(classId: string, date?: string): Observable<AttendanceRecord[]> {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.http.get<AttendanceRecord[]>(
      `${this.apiUrl}/attendance/class/${classId}`,
      { params: { date: d } },
    );
  }

  /** Get all attendance records (all dates) for a specific enrollment */
  getAttendanceByStudent(enrollmentId: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(
      `${this.apiUrl}/attendance/student/${enrollmentId}`,
    );
  }

  // ── Evening Checkout / Secure Pickup ──

  /** Record secure checkout: who picked up the child + optional photo */
  checkoutStudent(
    attendanceId: string,
    pickupPersonName: string,
    pickupPersonPhoto?: string,
    notes?: string,
  ): Observable<AttendanceRecord> {
    const body: CheckoutDto = {
      pickup_by_name: pickupPersonName,
      pickup_by_photo_url: pickupPersonPhoto,
      pickup_notes: notes,
    };
    return this.http.patch<AttendanceRecord>(
      `${this.apiUrl}/attendance/${attendanceId}/checkout`,
      body,
    );
  }

  /** Broadcast "arrived safely" push notification to all present parents */
  broadcastArrival(classId: string, date?: string): Observable<{ notified: number }> {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.http.post<{ notified: number }>(
      `${this.apiUrl}/attendance/broadcast-arrival`,
      { class_id: classId, date: d },
    );
  }
}
