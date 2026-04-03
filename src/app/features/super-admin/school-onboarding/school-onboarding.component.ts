import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminService, OnboardResult } from '../../../data/services/super-admin.service';

@Component({
  selector: 'app-school-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './school-onboarding.component.html',
})
export class SchoolOnboardingComponent {
  step = 1;
  submitting = false;
  error = '';
  result: OnboardResult | null = null;

  private cdr = inject(ChangeDetectorRef);

  schoolForm: FormGroup;
  adminForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private superAdminService: SuperAdminService,
    private router: Router,
  ) {
    this.schoolForm = this.fb.group({
      schoolName: ['', [Validators.required, Validators.maxLength(150)]],
      subdomain: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]+$/)]],
      location: ['Whitefield, Bangalore'],
    });

    this.adminForm = this.fb.group({
      adminName: ['', [Validators.required, Validators.maxLength(100)]],
      adminEmail: ['', [Validators.required, Validators.email]],
      phone: [''],
    });
  }

  /** Auto-generate subdomain from school name */
  onSchoolNameChange(): void {
    const name = this.schoolForm.get('schoolName')?.value || '';
    const sub = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.schoolForm.get('subdomain')?.setValue(sub);
  }

  nextStep(): void {
    if (this.schoolForm.invalid) {
      this.schoolForm.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  prevStep(): void {
    this.step = 1;
    this.error = '';
  }

  launch(): void {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.error = '';

    const payload = {
      schoolName: this.schoolForm.value.schoolName.trim(),
      subdomain: this.schoolForm.value.subdomain.trim(),
      adminEmail: this.adminForm.value.adminEmail.trim(),
      adminName: this.adminForm.value.adminName.trim(),
    };

    this.superAdminService.onboardSchool(payload).subscribe({
      next: (res) => {
        this.result = res;
        this.step = 3;
        this.submitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Onboarding failed. Please try again.';
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/super-admin']);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }
}
