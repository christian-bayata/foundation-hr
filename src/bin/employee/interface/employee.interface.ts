import {
  Department,
  EmployeeStatus,
  EmployeeType,
  JobType,
} from '../enum/employee.enum';

export interface ListEmployeeQuery {
  q?: string;
  employeeType?: EmployeeType;
  department?: Department;
  jobTitle?: string;
  jobType?: JobType;
  status?: EmployeeStatus;
  location?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListEmployeeFilters {
  q?: string;
  employeeType?: EmployeeType;
  department?: Department;
  jobTitle?: string;
  jobType?: JobType;
  status?: EmployeeStatus;
  location?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
