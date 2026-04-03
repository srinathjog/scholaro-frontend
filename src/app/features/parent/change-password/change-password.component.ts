import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-rose-50 py-8 px-2">
      <form [formGroup]="form" (ngSubmit)="onSubmit()"
        class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4">

        <div class="flex flex-col items-center mb-2">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <span class="text-3xl">🔐</span>
          </div>
          <h2 class="text-2xl font-extrabold text-gray-800 mb-1">Change Password</h2>
          <p class="text-gray-500 text-sm text-center">
            Update your temporary password to secure your account.
          </p>
        </div>

        <!-- Current Password -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="currentPassword">Current Password</label>
          <input id="currentPassword" type="password" formControlName="currentPassword"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="currentPassword?.invalid && currentPassword?.touched">
          <div *ngIf="currentPassword?.invalid && currentPassword?.touched" class="text-red-500 text-xs mt-1">
            Current password is required.
          </div>
        </div>

        <!-- New Password -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="newPassword">New Password</label>
          <input id="newPassword" type="password" formControlName="newPassword"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="newPassword?.invalid && newPassword?.touched">
          <div *ngIf="newPassword?.invalid && newPassword?.touched" class="text-red-500 text-xs mt-1">
            <span *ngIf="newPassword?.errors?.['required']">New password is required.</span>
            <span *ngIf="newPassword?.errors?.['minlength']">Password must be at least 6 characters.</span>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="confirmPassword">Confirm New Password</label>
          <input id="confirmPassword" type="password" formControlName="confirmPassword"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 transition text-gray-800 bg-gray-50"
            [class.border-red-400]="confirmPassword?.invalid && confirmPassword?.touched">
          <div *ngIf="confirmPassword?.invalid && confirmPassword?.touched" class="text-red-500 text-xs mt-1">
            Please confirm your password.
          </div>
          <div *ngIf="form.errors?.['mismatch'] && confirmPassword?.touched" class="text-red-500 text-xs mt-1">
            Passwords do not match.
          </div>
        </div>

        <!-- Submit -->
        <button type="submit"
          class="w-full bg-gradient-to-r from-amber-500 to-orange-400 text-white py-2.5 rounded-lg font-bold text-lg shadow-md hover:from-amber-600 hover:to-orange-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          [disabled]="loading">
          {{ loading ? 'Updating...' : 'Update Password' }}
        </button>

        <!-- Success -->
        <div *ngIf="successMessage" class="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm text-center">
          {{ successMessage }}
        </div>

        <!-- Error -->
        <div *ngIf="errorMessage" class="text-red-600 text-center text-sm">{{ errorMessage }}</div>

        <!-- Back -->
        <div class="text-center mt-2">
          <a routerLink="/parent/timeline" class="text-orange-500 hover:underline text-sm font-medium">← Back to Timeline</a>
        </div>
      </form>
    </div>
  `,
})
export class ChangePasswordComponent {
  form: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  get currentPassword() { return this.form.get('currentPassword'); }
  get newPassword() { return this.form.get('newPassword'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }

  private passwordMatchValidator(group: AbstractControl) {
    const pw = group.get('newPassword')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { mismatch: true };
  }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { currentPassword, newPassword } = this.form.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'Password updated!';
        // Redirect after a brief pause
        setTimeout(() => this.router.navigate(['/parent/timeline']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to change password. Please try again.';
      },
    });
  }
}
