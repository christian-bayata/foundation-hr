import * as Joi from 'joi';
import {
  Department,
  EmployeeStatus,
  EmployeeType,
  JobType,
} from '../enum/employee.enum';

export const employeeIdParamSchema = Joi.string().trim().required().messages({
  'string.empty': 'Employee ID is required.',
  'any.required': 'Employee ID is required.',
});

export const createEmployeeSchema = Joi.object({
  firstName: Joi.string().required().messages({
    'any.required': 'First name is required.',
  }),
  lastName: Joi.string().required().messages({
    'any.required': 'Last name is required.',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  department: Joi.string()
    .valid(...Object.values(Department))
    .required()
    .messages({
      'any.only': 'Invalid department.',
      'any.required': 'Department is required.',
    }),
  role: Joi.string().required().messages({
    'any.required': 'Role is required.',
  }),
  jobType: Joi.string()
    .valid(...Object.values(JobType))
    .required()
    .messages({
      'any.only': 'Invalid job type.',
      'any.required': 'Job type is required.',
    }),
  supervisor: Joi.string().optional().allow('', null),
  location: Joi.string().optional().allow('', null),
  status: Joi.string()
    .valid(...Object.values(EmployeeStatus))
    .optional()
    .messages({
      'any.only': 'Invalid status.',
    }),
  avatarUrl: Joi.string().optional().allow('', null),
  req: Joi.any(),
});

const sortableFields = ['name', 'jobTitle', 'department', 'jobType'];

export const listEmployeeQuerySchema = Joi.object({
  q: Joi.string().trim().optional().allow(''),
  employeeType: Joi.string()
    .valid(...Object.values(EmployeeType))
    .optional()
    .messages({
      'any.only': 'Invalid employee type filter.',
    }),
  department: Joi.string()
    .valid(...Object.values(Department))
    .optional()
    .messages({
      'any.only': 'Invalid department filter.',
    }),
  jobTitle: Joi.string().trim().optional().allow(''),
  jobType: Joi.string()
    .valid(...Object.values(JobType))
    .optional()
    .messages({
      'any.only': 'Invalid job type filter.',
    }),
  status: Joi.string()
    .valid(...Object.values(EmployeeStatus))
    .optional()
    .messages({
      'any.only': 'Invalid status filter.',
    }),
  location: Joi.string().trim().optional().allow(''),
  sortBy: Joi.string()
    .valid(...sortableFields)
    .optional()
    .default('createdAt')
    .messages({
      'any.only': 'Invalid sort field.',
    }),
  sortDir: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'sortDir must be asc or desc.',
    }),
  page: Joi.number().min(1).optional().default(1).messages({
    'number.min': 'Page must be at least 1.',
  }),
  pageSize: Joi.number().min(1).max(100).optional().default(10).messages({
    'number.min': 'Page size must be at least 1.',
    'number.max': 'Page size must be at most 100.',
  }),
  req: Joi.any(),
});
