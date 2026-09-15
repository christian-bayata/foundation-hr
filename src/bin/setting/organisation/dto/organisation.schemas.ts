import * as Joi from 'joi';
import { BusinessType } from '../enum/organisation.enum';

export const orgGeneralInfoSchema = Joi.object({
  name: Joi.string().trim().max(120).optional().allow('', null).messages({
    'string.max': 'Organisation name must be at most 120 characters.',
  }),
  registrationNumber: Joi.string()
    .trim()
    .max(60)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Registration number must be at most 60 characters.',
    }),
  website: Joi.string().trim().max(255).optional().allow('', null).messages({
    'string.max': 'Website must be at most 255 characters.',
  }),
  primaryContactEmail: Joi.string()
    .trim()
    .email()
    .optional()
    .allow('', null)
    .messages({
      'string.email': 'Primary contact email must be a valid email address.',
    }),
  phoneNumber: Joi.string().trim().max(30).optional().allow('', null).messages({
    'string.max': 'Phone number must be at most 30 characters.',
  }),
  timezone: Joi.string().trim().max(120).optional().allow('', null).messages({
    'string.max': 'Time zone must be at most 120 characters.',
  }),
  language: Joi.string().trim().max(60).optional().allow('', null).messages({
    'string.max': 'Language must be at most 60 characters.',
  }),
  fiscalYearStartDate: Joi.string()
    .trim()
    .max(30)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Fiscal year start date must be at most 30 characters.',
    }),
});

export const orgBusinessDetailsSchema = Joi.object({
  // legalName: Joi.string().trim().max(160).optional().allow('', null).messages({
  //   'string.max': 'Legal name must be at most 160 characters.',
  // }),
  businessType: Joi.string()
    .valid(...Object.values(BusinessType))
    .optional()
    .messages({
      'any.only': 'Company type must be a valid company type.',
    }),
  industry: Joi.string().trim().max(120).optional().allow('', null).messages({
    'string.max': 'Industry must be at most 120 characters.',
  }),
  incorporationDate: Joi.string()
    .trim()
    .max(30)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Incorporation date must be at most 30 characters.',
    }),
  currency: Joi.string().trim().max(10).optional().allow('', null).messages({
    'string.max': 'Currency must be at most 10 characters.',
  }),
  tin: Joi.string().trim().max(1000).optional().allow('', null).messages({
    'string.max': 'Tax identification number must be at most 60 characters.',
  }),
  // tax: Joi.object({
  //   taxIdentificationNumber: Joi.string()
  //     .trim()
  //     .max(60)
  //     .optional()
  //     .allow('', null)
  //     .messages({
  //       'string.max':
  //         'Tax identification number must be at most 60 characters.',
  //     }),
  //   vatNumber: Joi.string().trim().max(60).optional().allow('', null).messages({
  //     'string.max': 'VAT number must be at most 60 characters.',
  //   }),
  // })
  //   .optional()
  //   .allow(null),
});

export const orgGenericSectionSchema = Joi.object({}).unknown(true);
