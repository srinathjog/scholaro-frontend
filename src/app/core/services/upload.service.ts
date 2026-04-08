import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private authService: AuthService) {}

  uploadImages(files: File[], onProgress?: (pct: number) => void): Promise<string[]> {
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
            resolve(res.urls);
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.timeout = 120000; // 2 minute timeout

      xhr.send(formData);
    });
  }
}
