import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry, timeout } from 'rxjs/operators';
import { TenantService } from '../services/tenant.service';

/** 15 s timeout — enough for mobile 4G/5G on a slow cell. */
const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
  constructor(private tenantService: TenantService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let headers = req.headers;
    const tenantId = this.tenantService.getTenantId();
    if (tenantId) {
      headers = headers.set('x-tenant-id', tenantId);
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const cloned = req.clone({ headers });
    const handled$ = next.handle(cloned);

    // Apply resilient-fetch only to GET requests — safe to retry idempotent reads.
    // Mutating requests (POST/PATCH/DELETE) are left as-is to avoid duplicate side effects.
    if (req.method === 'GET') {
      return handled$.pipe(
        timeout(REQUEST_TIMEOUT_MS),
        retry(2),
      );
    }
    return handled$;
  }
}
