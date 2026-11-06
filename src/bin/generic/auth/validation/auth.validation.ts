import * as Joi from 'joi';
import { UserType } from '../enum/user.enum';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).*$/;
const passwordMessages = {
  'string.min': 'Password must be at least 8 characters long.',
  'string.max': 'Password must be at most 72 characters long.',
  'string.pattern.base':
    'Password must contain at least one letter and one number.',
  'any.required': 'Password is required.',
};

export const signUpSchema = Joi.object({
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
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(passwordPattern)
    .required()
    .messages(passwordMessages),
  userType: Joi.string()
    .valid(UserType.COMPANY, UserType.INDIVIDUAL)
    .optional()
    .messages({
      'any.only': 'userType must be either company or individual.',
    }),
  req: Joi.any(),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Verification token is required.',
  }),
  req: Joi.any(),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  req: Joi.any(),
});

export const signInSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
  req: Joi.any(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required.',
  }),
  req: Joi.any(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  req: Joi.any(),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(passwordPattern)
    .required()
    .messages(passwordMessages),
  req: Joi.any(),
});
