export interface Employee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
  salary?: number;
  departmentId?: number;
  departmentName?: string;
  roleId?: number;
  roleName?: string;
  status: 'Active' | 'Inactive';
  joiningDate: string;
  profileImage?: string;
  address?: string;
  isInactive?: boolean;
}

export interface CreateEmployeeDto {
  employeeCode: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
  salary?: number;
  departmentId?: number;
  roleId?: number;
  status: string;
  joiningDate: string;
  profileImage?: string;
  address?: string;
  username?: string;
  password?: string;
}

export interface EmployeeFilter {
  search?: string;
  employeeCode?: string;
  departmentId?: number;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: string;
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}