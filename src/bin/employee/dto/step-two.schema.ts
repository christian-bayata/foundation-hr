import * as Joi from 'joi';
import {
  ContractDuration,
  Department,
  JobType,
  WorkMode,
} from '../enum/employee.enum';

export const stepTwoSchema = Joi.object({
  contractDuration: Joi.string()
    .valid(...Object.values(ContractDuration))
    .required()
    .messages({
      'any.only': 'Invalid contract duration.',
      'any.required': 'Contract duration is required.',
    }),
  jobType: Joi.string()
    .valid(...Object.values(JobType))
    .required()
    .messages({
      'any.only': 'Invalid employment type.',
      'any.required': 'Employment type is required.',
    }),
  workMode: Joi.string()
    .valid(...Object.values(WorkMode))
    .required()
    .messages({
      'any.only': 'Invalid work mode.',
      'any.required': 'Work mode is required.',
    }),
  probationPeriod: Joi.string()
    .valid('none', '1 month', '2 months', '3 months', '6 months')
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid probation period.',
    }),
  department: Joi.string()
    .valid(...Object.values(Department))
    .required()
    .messages({
      'any.only': 'Invalid department.',
      'any.required': 'Department is required.',
    }),
  jobTitle: Joi.string().trim().required().messages({
    'any.required': 'Job title is required.',
  }),
  supervisor: Joi.string().trim().optional().allow('', null),
  salary: Joi.number().optional().allow(null),
  salaryCurrency: Joi.string().trim().optional().allow('', null),
  req: Joi.any(),
});
