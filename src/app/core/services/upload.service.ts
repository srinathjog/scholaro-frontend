import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface UploadedMedia {
  url: string;
  media_type: 'image' | 'video';
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private authService: AuthService) {}

  /** Upload a single file, reporting per-file upload progress 0–100. */
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
      xhr.timeout = 300000; // 5 min — covers large videos

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

      // Attach auth token
      const token = this.authService.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Track upload progress
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
      xhr.timeout = 300000; // 5 minute timeout for large videos

      xhr.send(formData);
    });
  }

  /** @deprecated use uploadMedia */
  uploadImages(files: File[], onProgress?: (pct: number) => void): Promise<string[]> {
    return this.uploadMedia(files, onProgress).then((items) => items.map((i) => i.url));
  }
}
