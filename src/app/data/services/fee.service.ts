import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ──

export interface FeeStructure {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  class_id: string;
  name: string;
  description?: string;
  amount: number;
  due_date: string;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  created_at: string;
}

export interface Fee {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  fee_structure_id?: string;
  feeStructure?: FeeStructure;
  description: string;
  total_amount: number;
  discount_amount: number;
  discount_reason?: string;
  final_amount: number;
  paid_amount: number;
  due_date: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  created_by?: string;
  created_at: string;
  updated_at: string;
  enrollment?: {
    id: string;
    roll_number: string;
    class_id: string;
    student: {
      id: string;
      first_name: string;
      last_name: string;
    };
  };
}

export interface Defaulter {
  enrollment_id: string;
  student_name: string;
  roll_number: string;
  fees: Fee[];
  total_due: number;
  /** True when every fee for this student has status 'paid'. */
  is_fully_paid?: boolean;
}

export interface DefaultersReport {
  total_outstanding: number;
  count: number;
  defaulters: Defaulter[];
}

export interface FeeSummary {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  total_discount: number;
  by_status: Record<string, number>;
}

export interface InvoiceResult {
  created: number;
  skipped: number;
  fees: Fee[];
}

@Injectable({ providedIn: 'root' })
export class FeeService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Structures ──

  createStructure(data: Partial<FeeStructure>): Observable<FeeStructure> {
    return this.http.post<FeeStructure>(`${this.apiUrl}/fees/structures`, data);
  }

  getStructures(academicYearId?: string): Observable<FeeStructure[]> {
    const params: any = {};
    if (academicYearId) params.academic_year_id = academicYearId;
    return this.http.get<FeeStructure[]>(`${this.apiUrl}/fees/structures`, { params });
  }

  deleteStructure(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/fees/structures/${id}`);
  }

  // ── Invoices ──

  generateMonthlyInvoices(classId: string, month: string): Observable<InvoiceResult> {
    return this.http.post<InvoiceResult>(`${this.apiUrl}/fees/generate/${classId}`, { month });
  }

  createFee(data: any): Observable<Fee> {
    return this.http.post<Fee>(`${this.apiUrl}/fees`, data);
  }

  // ── Payments ──

  recordPayment(feeId: string, amount: string, paymentMethod?: string, reference?: string): Observable<Fee> {
    return this.http.patch<Fee>(`${this.apiUrl}/fees/${feeId}/pay`, {
      amount,
      payment_method: paymentMethod,
      reference,
    });
  }

  // ── Discounts ──

  applyDiscount(feeId: string, discountAmount: number, reason: string): Observable<Fee> {
    return this.http.patch<Fee>(`${this.apiUrl}/fees/${feeId}/discount`, {
      discount_amount: discountAmount,
      reason,
    });
  }

  // ── Queries ──

  getFeesByEnrollment(enrollmentId: string): Observable<Fee[]> {
    return this.http.get<Fee[]>(`${this.apiUrl}/fees/enrollment/${enrollmentId}`);
  }

  getDefaultersList(classId: string): Observable<DefaultersReport> {
    return this.http.get<DefaultersReport>(`${this.apiUrl}/fees/defaulters/${classId}`);
  }

  getAllStudentsFees(classId: string): Observable<{ count: number; entries: Defaulter[] }> {
    return this.http.get<{ count: number; entries: Defaulter[] }>(`${this.apiUrl}/fees/all-students/${classId}`);
  }

  getClassFeeSummary(classId: string): Observable<FeeSummary> {
    return this.http.get<FeeSummary>(`${this.apiUrl}/fees/summary/${classId}`);
  }

  // ── Overdue ──

  markOverdue(): Observable<{ marked_overdue: number }> {
    return this.http.post<{ marked_overdue: number }>(`${this.apiUrl}/fees/mark-overdue`, {});
  }
}
