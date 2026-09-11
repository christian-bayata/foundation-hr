import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { AnySchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: AnySchema) {}

  transform(value: unknown): unknown {
    const { error, value: validated } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      throw new BadRequestException(error.details.map((d) => d.message));
    }

    return validated;
  }
}
