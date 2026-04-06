import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  student_count: number;
  teacher_count: number;
  created_at: string;
}

export interface PlatformStats {
  total_schools: number;
  total_schools_active: number;
  total_students_all: number;
  new_signups_this_month: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    created_at: string;
  }[];
  schools: TenantInfo[];
}

export interface OnboardSchoolPayload {
  schoolName: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
}

export interface OnboardResult {
  tenant_id: string;
  tenant_code: string;
  school_name: string;
  subdomain: string;
  admin_email: string;
  temporary_password: string;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly api = `${environment.apiUrl}/super-admin`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.api}/stats`);
  }

  onboardSchool(payload: OnboardSchoolPayload): Observable<OnboardResult> {
    return this.http.post<OnboardResult>(`${this.api}/onboard`, payload);
  }

  updateTenantStatus(tenantId: string, status: string): Observable<any> {
    return this.http.patch(`${this.api}/tenants/${tenantId}/status`, { status });
  }
}
