import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BulkImportResult {
  imported: number;
  skipped?: number;
  errors?: Array<{ row: number; student: string; error: string }>;
  message?: string;
  parentsCreated?: number;
  parentsLinked?: number;
  newClasses?: number;
  newSections?: number;
}

@Injectable({ providedIn: 'root' })
export class BulkImportService {
  private readonly api = `${environment.apiUrl}/bulk-import`;

  constructor(private http: HttpClient) {}

  importStudents(file: File, tenantId: string): Observable<BulkImportResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tenant_id', tenantId);
    return this.http.post<BulkImportResult>(`${this.api}/students`, fd);
  }

  importTeachers(file: File, tenantId: string): Observable<BulkImportResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tenant_id', tenantId);
    return this.http.post<BulkImportResult>(`${this.api}/teachers`, fd);
  }
}
