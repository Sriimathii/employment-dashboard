export interface LoginRequest { username: string; password: string; }
 
export interface LoginResponse {
  token: string; username: string; role: string;
  userId: number; employeeId?: number;
  fullName: string; profileImage?: string; expiresAt: string;
}
 
export type UserRole = 'Admin' | 'Manager' | 'Employee';