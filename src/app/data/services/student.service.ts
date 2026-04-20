import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Student {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  status: string;
  created_at: string;
  current_class: string | null;
  current_section: string | null;
}

export interface ParentInfo {
  parent_user_id: string;
  relationship: string;
  name: string;
  email: string;
}

export interface StudentDetail extends Student {
  parents: ParentInfo[];
  enrollments: Array<{
    id: string;
    class_id: string;
    section_id: string;
    className: string | null;
    status: string;
    custom_fee_amount: string | null;
  }>;
}

export interface ParentSearchResult {
  id: string;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Student[]> {
    return this.http.get<Student[]>(this.api);
  }

  getById(id: string): Observable<Student> {
    return this.http.get<Student>(`${this.api}/${id}`);
  }

  getDetail(id: string): Observable<StudentDetail> {
    return this.http.get<StudentDetail>(`${this.api}/${id}/detail`);
  }

  searchParents(email: string): Observable<ParentSearchResult[]> {
    return this.http.get<ParentSearchResult[]>(`${this.api}/search-parents`, {
      params: { email },
    });
  }

  linkParent(studentId: string, parentUserId: string, relationship: string): Observable<any> {
    return this.http.post(`${this.api}/${studentId}/parents`, {
      parent_user_id: parentUserId,
      relationship,
    });
  }

  createAndLinkParent(
    studentId: string,
    data: { name: string; email: string; phone?: string; relationship: string },
  ): Observable<ParentInfo> {
    return this.http.post<ParentInfo>(`${this.api}/${studentId}/parents/create`, data);
  }

  updateCustomFee(enrollmentId: string, customFeeAmount: string | null): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/enrollments/${enrollmentId}/custom-fee`, {
      custom_fee_amount: customFeeAmount,
    });
  }

  /** Returns id, first_name, last_name for students enrolled in a class.
   * The TenantInterceptor automatically attaches x-tenant-id to every request. */
  getStudentsByClass(classId: string, sectionId?: string): Observable<Pick<Student, 'id' | 'first_name' | 'last_name'>[]> {
    const params: Record<string, string> = sectionId ? { sectionId } : {};
    return this.http.get<Pick<Student, 'id' | 'first_name' | 'last_name'>[]>(
      `${this.api}/by-class/${classId}`,
      { params },
    );
  }
}
