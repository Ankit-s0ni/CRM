import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

function flattenValidationErrors(
  errors: ValidationError[],
  path = '',
): Array<{
  field: string;
  messages: string[];
}> {
  return errors.flatMap((error) => {
    const field = path ? `${path}.${error.property}` : error.property;
    const current = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];

    return [
      ...current,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}
