import { Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppException } from '../../../common/response/app-exception';
import { RequestType } from '../../setting/request-management/enum/request-management.enum';
import { getCreateRequestDtoClass } from '../dto/create/create-request.registry';
import { formatValidationErrors } from '../form/request-validation.util';

@Injectable()
export class RequestCreateValidationPipe implements PipeTransform {
  transform(value: unknown): object {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AppException('Request payload must be an object.', 400);
    }

    const requestType = (value as Record<string, unknown>).requestType;
    if (
      typeof requestType !== 'string' ||
      !Object.values(RequestType).includes(requestType as RequestType)
    ) {
      throw new AppException('Request type is not valid.', 400);
    }

    const dtoClass = getCreateRequestDtoClass(requestType as RequestType);
    if (!dtoClass) {
      throw new AppException('Request form is not available.', 400);
    }

    const instance = plainToInstance(dtoClass, value);
    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new AppException(
        formatValidationErrors(errors, 'Request payload is invalid'),
        400,
      );
    }

    return instance;
  }
}
