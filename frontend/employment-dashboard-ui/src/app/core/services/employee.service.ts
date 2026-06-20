import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Employee, CreateEmployeeDto, EmployeeFilter, PagedResult } from '../models/employee.model';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly API = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  getAll(filter: EmployeeFilter): Observable<PagedResult<Employee>> {
    let params = new HttpParams()
      .set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.search)       params = params.set('search', filter.search);
    if (filter.employeeCode) params = params.set('employeeCode', filter.employeeCode);
    if (filter.departmentId) params = params.set('departmentId', filter.departmentId);
    if (filter.status)       params = params.set('status', filter.status);
    if (filter.sortBy)       params = params.set('sortBy', filter.sortBy);
    if (filter.sortDir)      params = params.set('sortDir', filter.sortDir);
    return this.http.get<PagedResult<Employee>>(this.API, { params });
  }

  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.API}/${id}`);
  }

  // FIX 2: Fetch next auto-generated employee code from backend
  getNextCode(): Observable<{ code: string }> {
    return this.http.get<{ code: string }>(`${this.API}/next-code`);
  }

  create(dto: CreateEmployeeDto): Observable<Employee> {
    return this.http.post<Employee>(this.API, dto);
  }

  update(id: number, dto: Partial<Employee>): Observable<void> {
    return this.http.put<void>(`${this.API}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  uploadPhoto(id: number, file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.API}/${id}/upload-photo`, fd);
  }
}