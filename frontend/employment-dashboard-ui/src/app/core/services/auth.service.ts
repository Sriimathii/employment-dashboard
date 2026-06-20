import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest  { username: string; password: string; }
export interface LoginResponse {
  token:        string;
  username:     string;
  role:         string;
  userId:       number;
  employeeId?:  number;
  fullName:     string;
  profileImage?: string;
  expiresAt:    string;
  isInactive?:  boolean;
  isReadOnly?:  boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API       = environment.apiUrl;
  private readonly TOKEN_KEY = 'emp_token';
  private readonly USER_KEY  = 'emp_user';

  currentUser = signal<LoginResponse | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API}/auth/login`, dto)
      .pipe(tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res));
        this.currentUser.set(res);
      }));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken():   string | null { return localStorage.getItem(this.TOKEN_KEY); }
  getRole():    string | null { return this.currentUser()?.role ?? null; }

  // FEATURE 3: Is user in read-only/inactive mode?
  isReadOnly(): boolean {
    return this.currentUser()?.isReadOnly === true ||
           this.currentUser()?.isInactive === true;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API}/auth/forgot-password`, { email });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API}/auth/change-password`,
      { currentPassword, newPassword });
  }

  private loadUser(): LoginResponse | null {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) ?? 'null'); }
    catch { return null; }
  }
}