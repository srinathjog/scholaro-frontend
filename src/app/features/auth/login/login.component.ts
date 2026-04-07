import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  loading = false;
  isSuperAdmin = false;
  codeFromUrl = false;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      schoolCode: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Smart Link: auto-fill school code from ?code= query param
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.loginForm.get('schoolCode')?.setValue(code.toUpperCase());
      this.codeFromUrl = true;
    }
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
  get schoolCode() { return this.loginForm.get('schoolCode'); }

  toggleSuperAdmin() {
    this.isSuperAdmin = !this.isSuperAdmin;
    if (this.isSuperAdmin) {
      this.loginForm.get('schoolCode')?.clearValidators();
      this.loginForm.get('schoolCode')?.setValue('');
    } else {
      this.loginForm.get('schoolCode')?.setValidators(Validators.required);
    }
    this.loginForm.get('schoolCode')?.updateValueAndValidity();
  }

  onSubmit() {
    this.errorMessage = null;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { email, password, schoolCode } = this.loginForm.value;
    const tenantId = this.isSuperAdmin ? '' : (schoolCode || '').trim();
    this.authService.login(email, password, tenantId).subscribe({
      next: (user: any) => {
        this.loading = false;
        const roles = this.authService.getRoles();
        if (roles.includes('SUPER_ADMIN')) {
          this.router.navigate(['/super-admin']);
        } else if (roles.includes('TEACHER')) {
          this.router.navigate(['/teacher/history']);
        } else if (roles.includes('PARENT')) {
          this.router.navigate(['/parent']);
        } else if (roles.includes('SCHOOL_ADMIN')) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || err?.message || 'Invalid Credentials';
        console.error('Login error:', err);
        this.cdr.markForCheck();
      }
    });
  }
}
