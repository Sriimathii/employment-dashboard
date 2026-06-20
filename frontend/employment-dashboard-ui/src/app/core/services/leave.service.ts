import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaveRequest {
  leaveId:         number;
  employeeId:      number;
  employeeName:    string;
  departmentName:  string;
  leaveType:       string;
  startDate:       string;
  endDate:         string;
  totalDays:       number;
  reason?:         string;
  status:          string;
  approvedByName?: string;
  remarks?:        string;
  createdAt:       string;
}

export interface PagedLeaveResult {
  data:  LeaveRequest[];
  total: number;
}

export interface LeaveBalance {
  monthlyLimit:     number;
  usedThisMonth:    number;
  remainingBalance: number;
  year:             number;
  month:            number;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly API = `${environment.apiUrl}/leave`;

  constructor(private http: HttpClient) {}

  getAll(status?: string, page = 1, pageSize = 10): Observable<PagedLeaveResult> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<PagedLeaveResult>(this.API, { params });
  }

  getMy(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.API}/my`);
  }

  getBalance(): Observable<LeaveBalance> {
    return this.http.get<LeaveBalance>(`${this.API}/balance`);
  }

  apply(dto: { leaveType: string; startDate: string; endDate: string; reason?: string }): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(this.API, dto);
  }

  approve(id: number, status: string, remarks?: string): Observable<void> {
    return this.http.put<void>(`${this.API}/${id}/approve`, { status, remarks });
  }

  // FEATURE 1: Cancel own pending leave
  cancel(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/${id}/cancel`);
  }
}