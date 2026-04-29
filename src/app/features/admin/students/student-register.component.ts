import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface PrefillFromLead {
  leadId: string;
  firstName: string;
  lastName: string;
  dob: string;
  expectedClass: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

interface SchoolClass {
  id: string;
  name: string;
}

@Component({
  selector: 'app-student-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-register.component.html',
})
export class StudentRegisterComponent implements OnInit {
  // ── Pre-fill state ──────────────────────────────────────────────────────
  prefill: PrefillFromLead | null = null;
  /** True when this form was opened via a lead → show a "coming from" banner */
  get isFromLead(): boolean { return !!this.prefill; }

  // ── Student fields ──────────────────────────────────────────────────────
  firstName = '';
  lastName = '';
  dob = '';
  gender = 'male';
  admissionDate = new Date().toISOString().slice(0, 10);
  status = 'active';

  // ── Class enrollment ────────────────────────────────────────────────────
  classes: SchoolClass[] = [];
  selectedClassId = '';
  loadingClasses = false;

  // ── Parent / guardian ───────────────────────────────────────────────────
  parentName = '';
  parentEmail = '';
  parentPhone = '';
  parentRelationship = 'parent';

  // ── UI state ────────────────────────────────────────────────────────────
  saving = false;
  saveError = '';

  private readonly studentsApi = `${environment.apiUrl}/students`;
  private readonly classesApi  = `${environment.apiUrl}/classes`;
  private readonly leadsApi    = `${environment.apiUrl}/leads`;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Pick up lead data from router state (set by InquiriesComponent.registerAsStudent)
    const nav = this.router.getCurrentNavigation();
    const state: { prefillFromLead?: PrefillFromLead } =
      nav?.extras?.state ?? (history.state as any) ?? {};

    if (state?.prefillFromLead) {
      const p = state.prefillFromLead;
      this.prefill       = p;
      this.firstName     = p.firstName;
      this.lastName      = p.lastName;
      this.dob           = p.dob;
      this.parentName    = p.parentName;
      this.parentEmail   = p.parentEmail;
      this.parentPhone   = p.parentPhone;
    }

    this.loadClasses();
  }

  private loadClasses(): void {
    this.loadingClasses = true;
    this.http.get<SchoolClass[]>(this.classesApi).subscribe({
      next: (data) => {
        this.classes = data;
        this.loadingClasses = false;
        // If the lead specified an expected class, try to match by name
        if (this.prefill?.expectedClass) {
          const match = data.find(c =>
            c.name.toLowerCase().includes(this.prefill!.expectedClass.toLowerCase()) ||
            this.prefill!.expectedClass.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) this.selectedClassId = match.id;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingClasses = false;
        this.cdr.detectChanges();
      },
    });
  }

  get formValid(): boolean {
    return this.firstName.trim().length > 0 &&
           this.lastName.trim().length > 0 &&
           this.dob.length > 0 &&
           this.admissionDate.length > 0;
  }

  save(): void {
    if (!this.formValid || this.saving) return;
    this.saving = true;
    this.saveError = '';

    const studentPayload = {
      first_name:     this.firstName.trim(),
      last_name:      this.lastName.trim(),
      date_of_birth:  this.dob,
      gender:         this.gender,
      admission_date: this.admissionDate,
      status:         this.status,
    };

    this.http.post<{ id: string }>(this.studentsApi, studentPayload).subscribe({
      next: (student) => {
        const studentId = student.id;
        this.linkParentAndFinalize(studentId);
      },
      error: (err) => {
        this.saveError = err.error?.message || 'Failed to create student. Please check the details.';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  private linkParentAndFinalize(studentId: string): void {
    if (!this.parentName.trim()) {
      this.enrollInClass(studentId);
      return;
    }

    const parentPayload: Record<string, string> = {
      name:         this.parentName.trim(),
      relationship: this.parentRelationship,
    };
    if (this.parentEmail.trim()) parentPayload['email'] = this.parentEmail.trim();
    if (this.parentPhone.trim()) parentPayload['phone'] = this.parentPhone.trim();

    this.http
      .post(`${this.studentsApi}/${studentId}/parents/create`, parentPayload)
      .subscribe({
        next: () => this.enrollInClass(studentId),
        error: () => this.enrollInClass(studentId), // non-fatal
      });
  }

  private enrollInClass(studentId: string): void {
    if (!this.selectedClassId) {
      this.markLeadEnrolledAndNavigate(studentId);
      return;
    }

    this.http
      .post(`${environment.apiUrl}/enrollments`, {
        student_id: studentId,
        class_id:   this.selectedClassId,
        status:     'active',
      })
      .subscribe({
        next: () => this.markLeadEnrolledAndNavigate(studentId),
        error: () => this.markLeadEnrolledAndNavigate(studentId), // non-fatal
      });
  }

  private markLeadEnrolledAndNavigate(studentId: string): void {
    if (!this.prefill?.leadId) {
      this.saving = false;
      this.router.navigate(['/admin/students', studentId]);
      return;
    }

    this.http
      .patch(`${this.leadsApi}/${this.prefill.leadId}`, { status: 'enrolled' })
      .subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/admin/students', studentId]);
        },
        error: () => {
          this.saving = false;
          this.router.navigate(['/admin/students', studentId]);
        },
      });
  }

  cancel(): void {
    if (this.isFromLead) {
      this.router.navigate(['/admin/inquiries']);
    } else {
      this.router.navigate(['/admin/students']);
    }
  }
}
