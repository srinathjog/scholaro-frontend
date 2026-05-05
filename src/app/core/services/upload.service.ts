import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';

export interface UploadedMedia {
  url: string;
  media_type: 'image' | 'video';
}

export interface SignedUploadSlot {
  signedUrl: string;
  path: string;
  publicUrl: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
  ) {}

  /**
   * Ask the backend to generate N Supabase signed upload URLs — one per file.
   * No image bytes touch the NestJS server.
   */
  async getSignedUploadUrls(
    files: File[],
  ): Promise<SignedUploadSlot[]> {
    const token = this.authService.getToken();
    const tenantId = this.tenantService.getTenantId();
    const res = await fetch(`${environment.apiUrl}/activities/upload-urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      },
      body: JSON.stringify({
        files: files.map(f => ({ contentType: f.type || 'image/jpeg' })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[UploadService] upload-urls failed ${res.status}:`, body);
      throw new Error(`Server returned ${res.status} preparing upload. Please try again.`);
    }
    const data = await res.json();
    return data.urls as SignedUploadSlot[];
  }

  /**
   * Upload a single compressed file DIRECTLY to Supabase via a pre-signed PUT URL.
   * NestJS is never in the data path — Phone → Supabase directly.
   */
  uploadDirectToSupabase(
    file: File,
    signedUrl: string,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
      // Do NOT add x-upsert or other custom headers — signed upload URLs are
      // self-contained. Custom headers trigger a CORS preflight OPTIONS request
      // that Supabase's /object/upload/sign/ endpoint rejects → xhr.onerror.

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Direct upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during direct upload'));
      xhr.ontimeout = () => reject(new Error('Direct upload timed out'));
      xhr.timeout = 120_000; // 2 min per file

      xhr.send(file);
    });
  }

  /**
   * Upload all compressed files in parallel with a concurrency cap of 4.
   * Calls onFileComplete(index) after each file finishes so the UI can
   * update "X of N uploaded" instantly.
   */
  async uploadAllParallel(
    files: File[],
    slots: SignedUploadSlot[],
    onFileComplete: (index: number) => void,
  ): Promise<void> {
    const CONCURRENCY = 4;
    const queue = files.map((file, i) => ({ file, slot: slots[i], index: i }));

    // Process in batches of CONCURRENCY — simple, reliable, no external deps
    for (let start = 0; start < queue.length; start += CONCURRENCY) {
      const batch = queue.slice(start, start + CONCURRENCY);
      await Promise.all(
        batch.map(async ({ file, slot, index }) => {
          await this.uploadDirectToSupabase(file, slot.signedUrl);
          onFileComplete(index);
        }),
      );
    }
  }

  /** Upload a single file, reporting per-file upload progress 0–100. (legacy path) */
  uploadSingleFile(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('files', file, file.name);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${environment.apiUrl}/activities/upload`);

      const token = this.authService.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const item = (res.files as UploadedMedia[])[0];
            resolve(item);
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.timeout = 300000;

      xhr.send(formData);
    });
  }

  uploadMedia(files: File[], onProgress?: (pct: number) => void): Promise<UploadedMedia[]> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file, file.name);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${environment.apiUrl}/activities/upload`);

      const token = this.authService.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.files as UploadedMedia[]);
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.timeout = 300000;

      xhr.send(formData);
    });
  }

  /** @deprecated use uploadMedia */
  uploadImages(files: File[], onProgress?: (pct: number) => void): Promise<string[]> {
    return this.uploadMedia(files, onProgress).then((items) => items.map((i) => i.url));
  }
}
