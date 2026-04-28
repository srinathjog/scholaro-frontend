import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BrandingSettings {
  id: string;
  tenant_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  school_motto: string | null;
  contact_phone: string;
  updated_at: string;
}

export interface UpdateBrandingPayload {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  school_motto?: string;
  contact_phone?: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getBranding(): Observable<BrandingSettings> {
    return this.http.get<BrandingSettings>(`${this.api}/branding`);
  }

  uploadLogo(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post<{ url: string }>(`${this.api}/branding/logo`, form);
  }

  updateBranding(payload: UpdateBrandingPayload): Observable<BrandingSettings> {
    return this.http.patch<BrandingSettings>(`${this.api}/branding`, payload);
  }
}
