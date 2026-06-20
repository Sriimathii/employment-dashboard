import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API = `${environment.apiUrl}/profile`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get(this.API);
  }

  updateProfile(dto: { phoneNumber?: string; address?: string }): Observable<any> {
    return this.http.put(this.API, dto);
  }
}
