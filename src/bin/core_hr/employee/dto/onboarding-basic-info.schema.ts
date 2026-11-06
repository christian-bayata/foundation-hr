import * as Joi from 'joi';
import {
  EducationLevel,
  MaritalStatus,
  Religion,
  Sex,
} from '../enum/employee.enum';

const personalDetailsSchema = Joi.object({
  phone: Joi.string().trim().allow('', null),
  dateOfBirth: Joi.date().iso().allow('', null).messages({
    'date.base': 'Date of birth must be a valid date.',
  }),
  sex: Joi.string()
    .valid(...Object.values(Sex))
    .allow('', null)
    .messages({
      'any.only': 'Invalid sex.',
    }),
  nationality: Joi.string().trim().allow('', null),
  stateOfOrigin: Joi.string().trim().allow('', null),
  lga: Joi.string().trim().allow('', null),
  maritalStatus: Joi.string()
    .valid(...Object.values(MaritalStatus))
    .allow('', null)
    .messages({
      'any.only': 'Invalid marital status.',
    }),
  religion: Joi.string()
    .valid(...Object.values(Religion))
    .allow('', null)
    .messages({
      'any.only': 'Invalid religion.',
    }),
});

const homeAddressSchema = Joi.object({
  address: Joi.string().trim().allow('', null),
  country: Joi.string().trim().allow('', null),
  state: Joi.string().trim().allow('', null),
});

const academicInfoSchema = Joi.object({
  educationLevel: Joi.string()
    .valid(...Object.values(EducationLevel))
    .allow('', null)
    .messages({
      'any.only': 'Invalid education level.',
    }),
  institution: Joi.string().trim().allow('', null),
  qualification: Joi.string().trim().allow('', null),
});

export const onboardingBasicInformationSchema = Joi.object({
  personalDetails: personalDetailsSchema.optional(),
  homeAddress: homeAddressSchema.optional(),
  academicInfo: academicInfoSchema.optional(),
  req: Joi.any(),
});