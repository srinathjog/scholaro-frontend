import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 py-8 px-2">
      <form [formGroup]="form" (ngSubmit)="onSubmit()"
        class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4">

        <div class="flex flex-col items-center mb-2">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-extrabold text-gray-800 mb-1">Forgot Password</h2>
          <p class="text-gray-500 text-sm text-center">Enter your school code and email. We'll send you a reset link.</p>
        </div>

        <!-- School Code -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="schoolCode">School Code</label>
          <input id="schoolCode" type="text" formControlName="schoolCode"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="schoolCode?.invalid && schoolCode?.touched">
          <div *ngIf="schoolCode?.invalid && schoolCode?.touched" class="text-red-500 text-xs mt-1">
            School code is required.
          </div>
        </div>

        <!-- Email -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="email">Email</label>
          <input id="email" type="email" formControlName="email"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="email?.invalid && email?.touched">
          <div *ngIf="email?.invalid && email?.touched" class="text-red-500 text-xs mt-1">
            <span *ngIf="email?.errors?.['required']">Email is required.</span>
            <span *ngIf="email?.errors?.['email']">Enter a valid email.</span>
          </div>
        </div>

        <!-- Submit -->
        <button type="submit"
          class="w-full bg-gradient-to-r from-blue-500 to-green-400 text-white py-2.5 rounded-lg font-bold text-lg shadow-md hover:from-blue-600 hover:to-green-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          [disabled]="loading">
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>

        <!-- Success -->
        <div *ngIf="successMessage" class="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm text-center">
          {{ successMessage }}
        </div>

        <!-- Error -->
        <div *ngIf="errorMessage" class="text-red-600 text-center text-sm">{{ errorMessage }}</div>

        <!-- Back to login -->
        <div class="text-center mt-2">
          <a routerLink="/login" class="text-blue-500 hover:underline text-sm font-medium">&larr; Back to Login</a>
        </div>
      </form>
    </div>
  `,
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private tenantService: TenantService,
  ) {
    this.form = this.fb.group({
      schoolCode: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get email() { return this.form.get('email'); }
  get schoolCode() { return this.form.get('schoolCode'); }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { email, schoolCode } = this.form.value;

    this.authService.requestPasswordReset(email, schoolCode).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'If that email exists, a reset link has been sent.';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Something went wrong. Please try again.';
      },
    });
  }
}
