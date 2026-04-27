
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, timeout } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { TenantService } from './tenant.service';
import { environment } from '../../../environments/environment';

interface JwtPayload {
  userId: string;
  tenantId: string;
  roles: string[];
  email?: string;
  isFirstLogin?: boolean;
  exp: number;
  iat: number;
  [key: string]: any;
}

export interface CurrentUser {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  tenantId: string;
  token: string;
  isFirstLogin: boolean;
  schoolName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private tenantService: TenantService,
  ) {
    // Restore user and tenant from stored JWT on startup
    const restored = this.loadUserFromStorage();
    if (restored) {
      this.tenantService.setTenantId(restored.tenantId);
      this.currentUserSubject.next(restored);
    }
  }

  login(email: string, password: string, schoolCode: string): Observable<any> {
    console.time('loginCall');
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, {
      email, password, school_code: schoolCode || undefined,
    }).pipe(
      timeout(10000),
      tap((res) => {
        console.timeEnd('loginCall');
        if (res && res.access_token) {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          const payload = this.decodeToken(res.access_token);
          const user: CurrentUser = {
            userId: payload.userId,
            email: payload.email || email,
            role: payload.roles?.[0] || '',
            roles: payload.roles || [],
            tenantId: payload.tenantId || '',
            token: res.access_token,
            isFirstLogin: payload.isFirstLogin || false,
            schoolName: res.tenant_name || '',
          };
          // Store real UUID from JWT for subsequent API calls
          if (user.tenantId) {
            this.tenantService.setTenantId(user.tenantId);
          }
          if (user.schoolName) {
            localStorage.setItem('school_name', user.schoolName);
          }
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  register(data: { email: string; password: string; tenantId: string; [key: string]: any }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, data);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('school_name');
    this.tenantService.clearTenantId();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getRole(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.role : null;
  }

  getRoles(): string[] {
    const user = this.currentUserSubject.value;
    return user ? user.roles : [];
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  private decodeToken(token: string): JwtPayload {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return { userId: '', tenantId: '', roles: [], exp: 0, iat: 0 };
    }
  }

  private loadUserFromStorage(): CurrentUser | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;
    const payload = this.decodeToken(token);
    if (!payload || !payload.userId) return null;
    // Check token expiry
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(this.TOKEN_KEY);
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email || '',
      role: payload.roles?.[0] || '',
      roles: payload.roles || [],
      tenantId: payload.tenantId || '',
      token,
      isFirstLogin: payload.isFirstLogin || false,
      schoolName: localStorage.getItem('school_name') || '',
    };
  }

  getSchoolName(): string {
    return this.currentUserSubject.value?.schoolName
      || localStorage.getItem('school_name')
      || '';
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword,
    }).pipe(
      tap(() => {
        // Update local state so the banner disappears
        const cur = this.currentUserSubject.value;
        if (cur) {
          this.currentUserSubject.next({ ...cur, isFirstLogin: false });
        }
      }),
    );
  }

  requestPasswordReset(email: string, schoolCode?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, {
      email, school_code: schoolCode || undefined,
    });
  }

  completePasswordReset(token: string, newPassword: string, schoolCode?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, {
      token, newPassword, school_code: schoolCode || undefined,
    });
  }
}
