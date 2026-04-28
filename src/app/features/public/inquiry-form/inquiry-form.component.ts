import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface SchoolInfo {
  name: string;
  logo_url: string | null;
}

interface InquiryPayload {
  tenant_code: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  child_name: string;
  child_dob: string;
  expected_class: string;
  notes: string;
}

@Component({
  selector: 'app-inquiry-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inquiry-form.component.html',
})
export class InquiryFormComponent implements OnInit {
  tenantCode = '';

  // School info loaded from public API
  schoolName = 'Our School';
  schoolLogo: string | null = null;
  loadingSchool = true;
  schoolNotFound = false;

  // Form state
  parentName = '';
  parentPhone = '';
  parentEmail = '';
  childName = '';
  childDob = '';
  expectedClass = '';
  heardAbout = '';
  notes = '';

  submitting = false;
  submitted = false;
  submitError = '';

  readonly classOptions = [
    'Play Group (2–3 yrs)',
    'Nursery (3–4 yrs)',
    'LKG (4–5 yrs)',
    'UKG (5–6 yrs)',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Other',
  ];

  readonly heardOptions = [
    'Friend / Family Referral',
    'Google Search',
    'Instagram / Facebook',
    'Passed by the School',
    'School Event / Fair',
    'Newspaper / Magazine',
    'Other',
  ];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tenantCode = (this.route.snapshot.paramMap.get('code') || '').toUpperCase();
    this.loadSchoolInfo();
  }

  private loadSchoolInfo(): void {
    if (!this.tenantCode) {
      this.loadingSchool = false;
      this.schoolNotFound = true;
      return;
    }
    this.http
      .get<SchoolInfo>(`${environment.apiUrl}/tenants/info/${this.tenantCode}`)
      .subscribe({
        next: (info) => {
          this.schoolName = info.name;
          this.schoolLogo = info.logo_url;
          this.loadingSchool = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingSchool = false;
          this.schoolNotFound = true;
          this.cdr.detectChanges();
        },
      });
  }

  get formValid(): boolean {
    return (
      this.parentName.trim().length > 0 &&
      this.parentPhone.trim().length >= 10 &&
      this.childName.trim().length > 0
    );
  }

  submit(): void {
    if (!this.formValid || this.submitting) return;
    this.submitting = true;
    this.submitError = '';

    const payload: InquiryPayload = {
      tenant_code: this.tenantCode,
      parent_name: this.parentName.trim(),
      parent_phone: this.parentPhone.trim(),
      parent_email: this.parentEmail.trim(),
      child_name: this.childName.trim(),
      child_dob: this.childDob,
      expected_class: this.expectedClass,
      notes: [
        this.heardAbout ? `Heard about us via: ${this.heardAbout}` : '',
        this.notes.trim(),
      ].filter(Boolean).join('\n'),
    };

    this.http
      .post(`${environment.apiUrl}/public/inquiries/submit`, payload)
      .subscribe({
        next: () => {
          this.submitted = true;
          this.submitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.submitError =
            err.error?.message || 'Something went wrong. Please try again.';
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.parentName = '';
    this.parentPhone = '';
    this.parentEmail = '';
    this.childName = '';
    this.childDob = '';
    this.expectedClass = '';
    this.heardAbout = '';
    this.notes = '';
    this.submitError = '';
    this.cdr.detectChanges();
  }
}
