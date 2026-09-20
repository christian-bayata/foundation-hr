import * as Joi from 'joi';
import { ContactType } from '../enum/employee.enum';

const contactSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(ContactType))
    .required()
    .messages({
      'any.only': 'Invalid contact type.',
      'any.required': 'Contact type is required.',
    }),
  fullName: Joi.string().trim().allow('', null),
  relationship: Joi.string().trim().allow('', null),
  phone: Joi.string().trim().allow('', null),
  email: Joi.string().email().allow('', null).messages({
    'string.email': 'Please provide a valid email address.',
  }),
  address: Joi.string().trim().allow('', null),
});

export const onboardingContactsSchema = Joi.object({
  contacts: Joi.array().items(contactSchema).optional(),
  req: Joi.any(),
});