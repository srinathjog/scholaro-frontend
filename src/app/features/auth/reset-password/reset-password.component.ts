import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 py-8 px-2">
      <form [formGroup]="form" (ngSubmit)="onSubmit()"
        class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4">

        <div class="flex flex-col items-center mb-2">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-extrabold text-gray-800 mb-1">Reset Password</h2>
          <p class="text-gray-500 text-sm text-center">Choose a new password for your Scholaro account.</p>
        </div>

        <!-- Invalid token message -->
        <div *ngIf="!token" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm text-center">
          Invalid or missing reset link. Please
          <a routerLink="/forgot-password" class="text-blue-600 font-semibold hover:underline">request a new one</a>.
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

        <!-- New Password -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="newPassword">New Password</label>
          <input id="newPassword" type="password" formControlName="newPassword"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="newPassword?.invalid && newPassword?.touched">
          <div *ngIf="newPassword?.invalid && newPassword?.touched" class="text-red-500 text-xs mt-1">
            <span *ngIf="newPassword?.errors?.['required']">New password is required.</span>
            <span *ngIf="newPassword?.errors?.['minlength']">Password must be at least 6 characters.</span>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" type="password" formControlName="confirmPassword"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="confirmPassword?.invalid && confirmPassword?.touched">
          <div *ngIf="confirmPassword?.invalid && confirmPassword?.touched" class="text-red-500 text-xs mt-1">
            <span *ngIf="confirmPassword?.errors?.['required']">Please confirm your password.</span>
          </div>
          <div *ngIf="form.errors?.['mismatch'] && confirmPassword?.touched" class="text-red-500 text-xs mt-1">
            Passwords do not match.
          </div>
        </div>

        <!-- Submit -->
        <button type="submit"
          class="w-full bg-gradient-to-r from-blue-500 to-green-400 text-white py-2.5 rounded-lg font-bold text-lg shadow-md hover:from-blue-600 hover:to-green-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          [disabled]="loading || !token">
          {{ loading ? 'Resetting...' : 'Reset Password' }}
        </button>

        <!-- Success -->
        <div *ngIf="successMessage" class="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm text-center">
          {{ successMessage }}
          <a routerLink="/login" class="block mt-2 text-blue-600 font-semibold hover:underline">Go to Login &rarr;</a>
        </div>

        <!-- Error -->
        <div *ngIf="errorMessage" class="text-red-600 text-center text-sm">{{ errorMessage }}</div>

        <!-- Back -->
        <div class="text-center mt-2">
          <a routerLink="/forgot-password" class="text-blue-500 hover:underline text-sm font-medium">&larr; Request a new link</a>
        </div>
      </form>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private tenantService: TenantService,
  ) {
    this.form = this.fb.group({
      schoolCode: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  get schoolCode() { return this.form.get('schoolCode'); }
  get newPassword() { return this.form.get('newPassword'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  private passwordMatchValidator(group: AbstractControl) {
    const pw = group.get('newPassword')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { mismatch: true };
  }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { schoolCode, newPassword } = this.form.value;

    this.tenantService.setTenantId(schoolCode);

    this.authService.completePasswordReset(this.token, newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'Password has been reset successfully.';
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid or expired reset link. Please request a new one.';
      },
    });
  }
}
