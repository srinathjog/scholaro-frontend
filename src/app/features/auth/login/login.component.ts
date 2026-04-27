import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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
  buttonLabel = 'Logging in...';
  isSuperAdmin = false;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  codeFromUrl = false;
  schoolName = '';

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
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
      this.fetchSchoolName(code);
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
      this.schoolName = '';
    } else {
      this.loginForm.get('schoolCode')?.setValidators(Validators.required);
    }
    this.loginForm.get('schoolCode')?.updateValueAndValidity();
  }

  fetchSchoolName(code: string) {
    const trimmed = code.trim();
    if (!trimmed) { this.schoolName = ''; return; }
    this.http.get<{ name: string }>(`${environment.apiUrl}/tenants/info/${encodeURIComponent(trimmed)}`)
      .subscribe({
        next: (res) => { this.schoolName = res.name; this.cdr.markForCheck(); },
        error: () => { this.schoolName = ''; }
      });
  }

  onSchoolCodeBlur() {
    const code = this.loginForm.get('schoolCode')?.value;
    if (code) { this.fetchSchoolName(code); }
  }

  onSubmit() {
    this.errorMessage = null;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.buttonLabel = 'Logging in...';
    this.slowTimer = setTimeout(() => {
      this.buttonLabel = 'Still working... checking connection';
      this.cdr.markForCheck();
    }, 3000);
    const { email, password, schoolCode } = this.loginForm.value;
    const tenantId = this.isSuperAdmin ? '' : (schoolCode || '').trim();
    this.authService.login(email, password, tenantId).subscribe({
      next: (user: any) => {
        if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }
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
        if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }
        this.loading = false;
        if (err?.name === 'TimeoutError') {
          this.errorMessage = 'Connection to school server is slow. Please check your data and try again.';
        } else {
          this.errorMessage = err?.error?.message || err?.message || 'Invalid credentials. Please try again.';
        }
        console.error('Login error:', err);
        this.cdr.markForCheck();
      }
    });
  }
}
