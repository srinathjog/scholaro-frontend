import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LocalBranding {
  logoUrl: string | null;
  primaryColor: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly TENANT_KEY = 'tenantId';

  /** Reactive branding state shared across all shells. Push here after logo upload or settings save. */
  private brandingSubject = new BehaviorSubject<LocalBranding>({
    logoUrl: null,
    primaryColor: '#4f46e5',
  });
  readonly branding$ = this.brandingSubject.asObservable();

  get currentBranding(): LocalBranding {
    return this.brandingSubject.value;
  }

  /** Call after branding is loaded or changed so all shells update immediately. */
  updateLocalBranding(partial: Partial<LocalBranding>): void {
    this.brandingSubject.next({ ...this.brandingSubject.value, ...partial });
  }

  getTenantId(): string | null {
    return localStorage.getItem(this.TENANT_KEY);
  }

  setTenantId(tenantId: string): void {
    localStorage.setItem(this.TENANT_KEY, tenantId);
  }

  clearTenantId(): void {
    localStorage.removeItem(this.TENANT_KEY);
  }
}
