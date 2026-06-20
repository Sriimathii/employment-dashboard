import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppSettingsData {
  contacts: Record<string, string>;
  emails:   Record<string, string>;
  support:  Record<string, string>;
  company:  Record<string, string>;
}

export interface FeedbackItem {
  feedbackId:   number;
  title:        string;
  description:  string;
  category:     string;
  status:       string;
  adminReply?:  string;
  submittedAt:  string;
  reviewedAt?:  string;
  submittedBy?: string;
  role?:        string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly API = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AppSettingsData> {
    return this.http.get<AppSettingsData>(this.API);
  }

  saveContacts(data: Record<string, string>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/contacts`, data);
  }

  saveEmails(data: Record<string, string>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/emails`, data);
  }

  saveSupport(data: Record<string, string>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/support`, data);
  }

  saveCompany(data: Record<string, string>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/company`, data);
  }

  submitFeedback(dto: { title: string; description: string; category: string }): Observable<any> {
    return this.http.post(`${this.API}/feedback`, dto);
  }

  getFeedback(status?: string, category?: string): Observable<FeedbackItem[]> {
    let url = `${this.API}/feedback`;
    const params: string[] = [];
    if (status)   params.push(`status=${status}`);
    if (category) params.push(`category=${category}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<FeedbackItem[]>(url);
  }

  reviewFeedback(id: number, data: { status?: string; adminReply?: string }): Observable<any> {
    return this.http.put(`${this.API}/feedback/${id}/review`, data);
  }
}