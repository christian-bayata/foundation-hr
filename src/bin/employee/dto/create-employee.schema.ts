import * as Joi from 'joi';
import {
  ContractDuration,
  EmployeeType,
  JobType,
  ProbationPeriod,
  WorkMode,
} from '../enum/employee.enum';

export const createEmployeeSchema = Joi.object({
  employeeType: Joi.string()
    .valid(...Object.values(EmployeeType))
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid employee type.',
    }),
  firstName: Joi.string().trim().optional().allow('', null),
  lastName: Joi.string().trim().optional().allow('', null),
  middleName: Joi.string().trim().optional().allow('', null),
  employeeId: Joi.string().trim().optional().allow('', null),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  employmentDate: Joi.date().iso().optional().allow('', null).messages({
    'date.base': 'Employment date must be a valid date.',
  }),
  inviteId: Joi.string()
    .trim()
    .pattern(/^[a-f\d]{24}$/i)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Invalid employee invite ID.',
    }),
  contractDuration: Joi.string()
    .valid(...Object.values(ContractDuration))
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid contract duration.',
    }),
  jobType: Joi.string()
    .valid(...Object.values(JobType))
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid employment type.',
    }),
  workMode: Joi.string()
    .valid(...Object.values(WorkMode))
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid work mode.',
    }),
  probationPeriod: Joi.string()
    .valid(...Object.values(ProbationPeriod))
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid probation period.',
    }),
  departmentCode: Joi.string().trim().optional().allow('', null),
  jobTitleCode: Joi.string().trim().optional().allow('', null),
  supervisor: Joi.string().trim().optional().allow('', null),
  salary: Joi.number().optional().allow('', null),
  salaryCurrency: Joi.string().trim().optional().allow('', null),
  req: Joi.any(),
});

export const updateEmployeeSchema = createEmployeeSchema.fork(
  ['email'],
  (field) => field.optional().allow('', null),
);