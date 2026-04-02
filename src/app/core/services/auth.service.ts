
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { TenantService } from './tenant.service';
import { environment } from '../../../environments/environment';

interface JwtPayload {
  userId: string;
  tenantId: string;
  roles: string[];
  email?: string;
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

  login(email: string, password: string, tenantId: string): Observable<any> {
    // Store tenant ID BEFORE the request so the TenantInterceptor can attach it as x-tenant-id header
    this.tenantService.setTenantId(tenantId);

    return this.http.post<any>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res && res.access_token) {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          const payload = this.decodeToken(res.access_token);
          const user: CurrentUser = {
            userId: payload.userId,
            email: payload.email || email,
            role: payload.roles?.[0] || '',
            roles: payload.roles || [],
            tenantId: payload.tenantId || tenantId,
            token: res.access_token,
          };
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
    };
  }
}
