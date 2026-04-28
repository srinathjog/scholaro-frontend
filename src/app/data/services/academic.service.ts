import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SchoolClass {
  id: string;
  name: string;
  tenant_id: string;
  created_at: string;
}

export interface Section {
  id: string;
  name: string;
  class_id: string;
  tenant_id: string;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  year: string;
  name?: string; // alias for year
  start_date: string;
  end_date: string;
  is_active: boolean;
  tenant_id: string;
}

export interface CreateAcademicYearPayload {
  year: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string | null;
  academic_year_id: string;
  tenant_id: string;
  created_at: string;
  assignedClass: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  // enriched on frontend
  teacherName?: string;
  academicYearName?: string;
}

export interface SectionCount {
  section_id: string;
  count: number;
}

export interface CreateAssignmentPayload {
  teacher_id: string;
  class_id: string;
  section_id?: string;
  academic_year_id: string;
}

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<SchoolClass[]> {
    return this.http.get<SchoolClass[]>(`${this.api}/classes`);
  }

  getSectionsByClass(classId: string): Observable<Section[]> {
    return this.http.get<Section[]>(`${this.api}/sections?classId=${classId}`);
  }

  createSection(data: { name: string; class_id: string }): Observable<Section> {
    return this.http.post<Section>(`${this.api}/sections`, data);
  }

  getAcademicYears(): Observable<AcademicYear[]> {
    return this.http.get<AcademicYear[]>(`${this.api}/academic-years`);
  }

  createAcademicYear(data: CreateAcademicYearPayload): Observable<AcademicYear> {
    return this.http.post<AcademicYear>(`${this.api}/academic-years`, data);
  }

  setActiveAcademicYear(id: string): Observable<AcademicYear> {
    return this.http.patch<AcademicYear>(`${this.api}/academic-years/${id}/set-active`, {});
  }

  getSectionStudentCounts(): Observable<SectionCount[]> {
    return this.http.get<SectionCount[]>(`${this.api}/enrollments/section-counts`);
  }

  getAssignments(): Observable<TeacherAssignment[]> {
    return this.http.get<TeacherAssignment[]>(`${this.api}/teacher-assignments`);
  }

  assignTeacher(data: CreateAssignmentPayload): Observable<TeacherAssignment> {
    return this.http.post<TeacherAssignment>(`${this.api}/teacher-assignments`, data);
  }

  deleteAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/teacher-assignments/${id}`);
  }

  deleteClass(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/classes/${id}`);
  }
}
