import * as Joi from 'joi';
import { EmployeeType } from '../enum/employee.enum';

export const stepOneSchema = Joi.object({
  employeeType: Joi.string()
    .valid(...Object.values(EmployeeType))
    .required()
    .messages({
      'any.only': 'Invalid employee type.',
      'any.required': 'Employee type is required.',
    }),
  firstName: Joi.string().trim().required().messages({
    'any.required': 'First name is required.',
  }),
  lastName: Joi.string().trim().required().messages({
    'any.required': 'Last name is required.',
  }),
  middleName: Joi.string().trim().optional().allow('', null),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  employmentDate: Joi.date().iso().required().messages({
    'date.base': 'Employment date must be a valid date.',
    'any.required': 'Employment date is required.',
  }),
  inviteId: Joi.string()
    .trim()
    .pattern(/^[a-f\d]{24}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid employee invite ID.',
    }),
  req: Joi.any(),
});
