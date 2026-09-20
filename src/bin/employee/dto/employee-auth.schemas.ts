import * as Joi from 'joi';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).*$/;
const passwordMessages = {
  'string.min': 'Password must be at least 8 characters long.',
  'string.max': 'Password must be at most 72 characters long.',
  'string.pattern.base':
    'Password must contain at least one letter and one number.',
  'any.required': 'Password is required.',
};

export const employeeLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
  req: Joi.any(),
});

export const employeeForgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  req: Joi.any(),
});

export const employeeResetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(passwordPattern)
    .required()
    .messages(passwordMessages),
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required.',
  }),
  req: Joi.any(),
});

export const employeeRefreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required.',
  }),
  req: Joi.any(),
});