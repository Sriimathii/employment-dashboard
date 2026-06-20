import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Attendance {
  attendanceId:         number; employeeId: number;
  employeeName:         string; employeeCode: string;
  attendanceDate:       string; checkInTime?: string; checkOutTime?: string;
  status:               string; workingHours?: number;
  checkInLatitude?:     number; checkInLongitude?: number;
  checkInLocationName?: string; checkOutLatitude?: number; checkOutLongitude?: number;
  isAutoCheckout?:      boolean;
}

export interface RosterDay    { day: number; date: string; dayName: string; isSunday: boolean; isHoliday: boolean; }
export interface RosterSummary {
  present: number; absent: number; late: number; od: number;
  hd: number;     ot: number;     cl: number;   ml: number;
  pl: number;     ul: number;     al: number;   sl: number;
  ol: number;     wo: number;     holiday: number;
  workingDays: number; attendedDays: number;
  totalWorkingHours: number; attendancePercentage: number;
}
export interface RosterEmployee {
  employeeId: number; employeeCode: string; employeeName: string;
  designation: string; departmentName: string;
  days: Record<number, string>;
  summary: RosterSummary;
}
export interface RosterResponse {
  year: number; month: number; monthName: string;
  daysInMonth: number; dayHeaders: RosterDay[];
  holidays: string[]; employees: RosterEmployee[];
}

export interface Holiday {
  holidayId: number; name: string; holidayDate: string; holidayType: string; year: number;
}

export interface GeoLocationConfig { index: number; name: string; lat: string; lng: string; radius: string; enabled: boolean; }
export interface MultiGeoSettings  { geoEnabled: boolean; locations: GeoLocationConfig[]; }
export interface GeoSettings       { enabled: boolean; lat: number; lng: number; radius: number; }
export interface CheckInResponse   {
  attendanceId: number; status: string; checkInTime: string;
  checkInLocationName?: string; message: string;
  isLate?: boolean; isAbsent?: boolean; requiresGeo?: boolean;
  outsideGeo?: boolean; distanceM?: number;
  nearestLocation?: string; authorizedLocations?: string[];
}
export interface CheckOutResponse  { checkOutTime: string; workingHours: number; message: string; status: string; }

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly API = `${environment.apiUrl}/attendance`;
  private readonly HOL = `${environment.apiUrl}/holiday`;

  constructor(private http: HttpClient) {}

  getAll(filter?: { employeeId?: number; from?: string; to?: string; status?: string; page?: number; pageSize?: number; }): Observable<{ data: Attendance[]; total: number }> {
    let params = new HttpParams();
    if (filter) {
      if (filter.employeeId != null) params = params.set('employeeId', filter.employeeId);
      if (filter.from)               params = params.set('from',       filter.from);
      if (filter.to)                 params = params.set('to',         filter.to);
      if (filter.status)             params = params.set('status',     filter.status);
      if (filter.page     != null)   params = params.set('page',       filter.page);
      if (filter.pageSize != null)   params = params.set('pageSize',   filter.pageSize);
    }
    return this.http.get<{ data: Attendance[]; total: number }>(this.API, { params });
  }

  getMy(page = 1, pageSize = 15): Observable<{ data: Attendance[]; total: number }> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<{ data: Attendance[]; total: number }>(`${this.API}/my`, { params });
  }

  // ── Roster (Monthly Attendance) ────────────────────────────
  getRoster(year: number, month: number, departmentId?: number, search?: string): Observable<RosterResponse> {
    let params = new HttpParams().set('year', year).set('month', month);
    if (departmentId) params = params.set('departmentId', departmentId);
    if (search)       params = params.set('search', search);
    return this.http.get<RosterResponse>(`${this.API}/roster`, { params });
  }

  // ── Holidays ───────────────────────────────────────────────
  getHolidays(year: number): Observable<Holiday[]> {
    return this.http.get<Holiday[]>(`${this.HOL}?year=${year}`);
  }
  addHoliday(dto: { name: string; holidayDate: string; holidayType?: string }): Observable<Holiday> {
    return this.http.post<Holiday>(this.HOL, dto);
  }
  deleteHoliday(id: number): Observable<void> {
    return this.http.delete<void>(`${this.HOL}/${id}`);
  }

  // ── Check-in / Check-out ────────────────────────────────────
  checkIn(location?: { latitude: number; longitude: number }): Observable<CheckInResponse> {
    const body = location ? { latitude: location.latitude, longitude: location.longitude } : {};
    return this.http.post<CheckInResponse>(`${this.API}/check-in`, body);
  }
  checkOut(location?: { latitude: number; longitude: number }): Observable<CheckOutResponse> {
    const body = location ? { latitude: location.latitude, longitude: location.longitude } : {};
    return this.http.post<CheckOutResponse>(`${this.API}/check-out`, body);
  }
  mark(dto: { employeeId: number; attendanceDate: string; checkInTime?: string; checkOutTime?: string; status: string }): Observable<void> {
    return this.http.post<void>(`${this.API}/mark`, dto);
  }
  getMultiGeoSettings(): Observable<MultiGeoSettings> {
    return this.http.get<MultiGeoSettings>(`${this.API}/geo-settings`);
  }
  saveMultiGeoSettings(dto: { geoEnabled: boolean; locations: { name: string; lat: number; lng: number; radius: number; enabled: boolean }[] }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/geo-settings`, dto);
  }
  getGeoSettings(): Observable<GeoSettings> { return this.getMultiGeoSettings() as any; }
  saveGeoSettings(s: GeoSettings): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/geo-settings`, s);
  }
  // Convenience method to load departments (for roster filter dropdown)
getDepartments(): Observable<{ departmentId: number; departmentName: string }[]> {
  return this.http.get<{ departmentId: number; departmentName: string }[]>(
    `${environment.apiUrl}/departments`
  );
}
}
