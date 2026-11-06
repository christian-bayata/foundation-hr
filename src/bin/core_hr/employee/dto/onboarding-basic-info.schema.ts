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

const documentSchema = Joi.object({
  name: Joi.string().trim().allow('', null),
  uploadedBy: Joi.string().trim().required(),
  type: Joi.string().trim().required(),
  uploadDate: Joi.date().iso().required().messages({
    'date.base': 'Upload date must be a valid date.',
  }),
  url: Joi.string().trim().required(),
});

export const onboardingDocumentsSchema = Joi.object({
  documents: Joi.array().items(documentSchema).required(),
  req: Joi.any(),
});

export const onboardingBasicInformationSchema = Joi.object({
  personalDetails: personalDetailsSchema.optional(),
  homeAddress: homeAddressSchema.optional(),
  academicInfo: academicInfoSchema.optional(),
  documents: Joi.array().items(documentSchema).optional(),
  req: Joi.any(),
});