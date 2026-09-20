import {
  EmployeeStatus,
  EmployeeType,
  JobType,
} from '../enum/employee.enum';

export interface ListEmployeeQuery {
  q?: string;
  employeeType?: EmployeeType;
  department?: string;
  jobTitle?: string;
  jobType?: JobType;
  status?: EmployeeStatus;
  location?: string;
  supervisorId?: string;
  organizationId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  batch?: number;
  limit?: number;
}

export interface ListEmployeeFilters {
  q?: string;
  employeeType?: EmployeeType;
  department?: string;
  jobTitle?: string;
  jobType?: JobType;
  status?: EmployeeStatus;
  location?: string;
  supervisorId?: string;
  organizationId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

export interface HierarchyTreeNode {
  children: HierarchyTreeNode[];
  [key: string]: any;
}
