import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly TENANT_KEY = 'tenantId';

  getTenantId(): string | null {
    // Prefer localStorage, can be extended for other sources
    return localStorage.getItem(this.TENANT_KEY);
  }

  setTenantId(tenantId: string): void {
    localStorage.setItem(this.TENANT_KEY, tenantId);
  }

  clearTenantId(): void {
    localStorage.removeItem(this.TENANT_KEY);
  }
}
