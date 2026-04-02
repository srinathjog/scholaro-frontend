import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private http: HttpClient) {}

  async uploadImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }

    const res = await firstValueFrom(
      this.http.post<{ urls: string[] }>(
        `${environment.apiUrl}/activities/upload`,
        formData,
      ),
    );

    return res.urls;
  }
}
