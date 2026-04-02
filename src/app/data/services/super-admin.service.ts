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

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly api = `${environment.apiUrl}/super-admin`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.api}/stats`);
  }
}
