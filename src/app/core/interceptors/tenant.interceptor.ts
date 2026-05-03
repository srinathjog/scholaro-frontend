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

/** 15 s timeout for GET reads — safe to retry on mobile 4G/5G. */
const GET_TIMEOUT_MS = 15_000;
/** 60 s timeout for mutating requests — covers large-payload POSTs like activity creation. */
const MUTATE_TIMEOUT_MS = 60_000;

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

    // GET: 15s with 2 retries (idempotent reads).
    // POST/PATCH/PUT/DELETE: 60s, no retry (avoid duplicate side effects).
    // Note: file uploads use XHR directly and bypass this interceptor.
    if (req.method === 'GET') {
      return handled$.pipe(
        timeout(GET_TIMEOUT_MS),
        retry(2),
      );
    }
    return handled$.pipe(timeout(MUTATE_TIMEOUT_MS));
  }
}
