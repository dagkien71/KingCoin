import { BadRequestException } from '@nestjs/common';
import type { FieldValidationErrors } from '@filters/validation-exception-factory';

export type ValidationFieldDetail = Record<string, string[]>;

export class ValidationException extends BadRequestException {
  constructor(
    public validationErrors:
      | ValidationFieldDetail[]
      | ValidationFieldDetail
      | FieldValidationErrors,
  ) {
    super();
  }
}
