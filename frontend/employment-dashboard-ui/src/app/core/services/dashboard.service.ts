import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API = `${environment.apiUrl}/dashboard`;
  constructor(private http: HttpClient) {}

  getAdminStats():   Observable<any> { return this.http.get(`${this.API}/admin`);   }
  getEmployeeStats():Observable<any> { return this.http.get(`${this.API}/employee`); }
  getManagerStats(): Observable<any> { return this.http.get(`${this.API}/manager`);  }
}