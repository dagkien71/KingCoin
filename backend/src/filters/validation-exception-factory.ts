import { ValidationError } from '@nestjs/common';
import { ValidationException } from '@filters/validation.exception';

export type FieldValidationErrors = Record<string, string[]>;

function collectFieldErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldValidationErrors {
  const out: FieldValidationErrors = {};

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.children?.length) {
      Object.assign(out, collectFieldErrors(error.children, path));
      continue;
    }

    if (error.constraints) {
      out[path] = Object.values(error.constraints);
    } else if (error.value !== undefined) {
      out[path] = [`${path} không hợp lệ.`];
    }
  }

  return out;
}

function validationExceptionFactory(validationErrors: ValidationError[]) {
  const fields = collectFieldErrors(validationErrors);
  const list = Object.entries(fields).map(([property, messages]) => ({
    [property]: messages,
  }));
  return new ValidationException(list.length > 0 ? list : fields);
}

export default validationExceptionFactory;
