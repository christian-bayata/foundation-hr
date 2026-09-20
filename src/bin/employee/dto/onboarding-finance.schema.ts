import * as Joi from 'joi';
import { VoluntaryContribution } from '../enum/employee.enum';

const bankDetailsSchema = Joi.object({
  bank: Joi.string().trim().allow('', null),
  accountHolderName: Joi.string().trim().allow('', null),
  accountNumber: Joi.string().trim().allow('', null),
  bvn: Joi.string().trim().allow('', null).messages({
    'string.base': 'BVN must be a string of digits.',
  }),
});

const pensionDetailsSchema = Joi.object({
  pensionProvider: Joi.string().trim().allow('', null),
  rsa: Joi.string().trim().allow('', null),
  voluntaryContribution: Joi.string()
    .valid(...Object.values(VoluntaryContribution))
    .allow('', null)
    .messages({
      'any.only': 'Invalid voluntary contribution selection.',
    }),
  voluntaryContributionAmount: Joi.number().allow(null).messages({
    'number.base': 'Voluntary contribution amount must be a number.',
  }),
});

const taxDetailsSchema = Joi.object({
  tin: Joi.string().trim().allow('', null),
  stateOfResidence: Joi.string().trim().allow('', null),
});

export const onboardingFinanceInformationSchema = Joi.object({
  bankDetails: bankDetailsSchema.optional(),
  pensionDetails: pensionDetailsSchema.optional(),
  taxDetails: taxDetailsSchema.optional(),
  req: Joi.any(),
});