import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '@filters/all-exception.filter';
import {
  PrismaClientExceptionFilter,
  PrismaValidationExceptionFilter,
} from '@providers/prisma/prisma-client-exception.filter';
import { ValidationExceptionFilter } from '@filters/validation-exception.filter';
import validationExceptionFactory from '@filters/validation-exception-factory';
import { BadRequestExceptionFilter } from '@filters/bad-request-exception.filter';
import { ConflictExceptionFilter } from '@filters/conflict-exception.filter';
import { ThrottlerExceptionsFilter } from '@filters/throttler-exception.filter';
import { AccessExceptionFilter } from '@filters/access-exception.filter';
import { NotFoundExceptionFilter } from '@filters/not-found-exception.filter';
import { TransformInterceptor } from '@interceptors/transform.interceptor';

/** Cấu hình pipe + filter + interceptor dùng chung production và e2e. */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(new TransformInterceptor());

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new AccessExceptionFilter(httpAdapter),
    new NotFoundExceptionFilter(),
    new BadRequestExceptionFilter(),
    new ConflictExceptionFilter(),
    new PrismaClientExceptionFilter(),
    new PrismaValidationExceptionFilter(),
    new ValidationExceptionFilter(),
    new ThrottlerExceptionsFilter(),
  );
}
