import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppException } from '../../../common/response/app-exception';
import { RequestType } from '../../setting/request-management/enum/request-management.enum';
import {
  getRequestFormDefinition,
  getRequestFormDtoClass,
} from './request-form.registry';
import { formatValidationErrors } from './request-validation.util';

@Injectable()
export class RequestFormValidatorService {
  validate(
    requestType: RequestType,
    details?: Record<string, unknown>,
  ): Record<string, unknown> {
    const definition = getRequestFormDefinition(requestType);
    const dtoClass = getRequestFormDtoClass(requestType);

    if (!definition || !dtoClass) {
      throw new AppException('Request form is not available.', 400);
    }

    const cleaned = Object.fromEntries(
      Object.entries(details ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    );
    const instance = plainToInstance(dtoClass, cleaned);
    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new AppException(formatValidationErrors(errors), 400);
    }

    const normalized: Record<string, unknown> = {};
    for (const field of definition.fields) {
      const value = cleaned[field.key];
      if (value === undefined) {
        continue;
      }

      normalized[field.key] = typeof value === 'string' ? value.trim() : value;
    }

    return normalized;
  }
}
