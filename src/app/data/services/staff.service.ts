import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(`${this.api}/staff`);
  }
}
