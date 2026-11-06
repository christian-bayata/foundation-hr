import * as Joi from 'joi';

export const setPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters.',
    'string.empty': 'Password is required.',
    'any.required': 'Password is required.',
  }),
  confirmPassword: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters.',
    'string.empty': 'Password is required.',
    'any.required': 'Password is required.',
  }),
  req: Joi.any(),
});
