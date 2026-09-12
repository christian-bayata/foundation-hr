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
  batch?: number;
  limit?: number;
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
  data: T[];
  count: number;
}
