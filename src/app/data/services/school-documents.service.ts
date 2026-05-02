import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SchoolDocument {
  id: string;
  title: string;
  file_url: string;
  file_type: 'pdf' | 'image';
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SchoolDocumentsService {
  private readonly url = `${environment.apiUrl}/school-documents`;

  constructor(private readonly http: HttpClient) {}

  getDocuments(): Observable<SchoolDocument[]> {
    return this.http.get<SchoolDocument[]>(this.url);
  }

  uploadDocument(title: string, file: File): Observable<SchoolDocument> {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('file', file, file.name);
    return this.http.post<SchoolDocument>(this.url, fd);
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
