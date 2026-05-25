import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DATABASE_ERROR } from '@constants/errors.constants';
import {
  prismaErrorMessage,
  prismaErrorStatus,
} from '@common/errors/prisma-error.messages';
import { parseCodedMessage } from '@common/errors/app-error.util';

/**
 * Map mọi {@link Prisma.PrismaClientKnownRequestError} sang envelope API — không fallthrough Nest default.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    const status = prismaErrorStatus(exception.code);
    const message = prismaErrorMessage(exception.code, exception.meta);
    const { code: defaultCode } = parseCodedMessage(DATABASE_ERROR);

    this.logger.warn(
      `Prisma ${exception.code}: ${exception.message}`,
      exception.stack,
    );

    const body = {
      success: false,
      error: {
        code: defaultCode ?? 500101,
        message,
        details: {
          prismaCode: exception.code,
          ...(exception.meta?.target != null
            ? { target: exception.meta.target }
            : {}),
        },
      },
    };

    return res.status(status).json(body);
  }
}

/** Prisma validation / unknown — envelope thống nhất, không lộ stack. */
@Catch(Prisma.PrismaClientValidationError)
export class PrismaValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaValidationExceptionFilter.name);

  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const { code } = parseCodedMessage(DATABASE_ERROR);

    this.logger.warn(exception.message, exception.stack);

    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: {
        code: code ?? 500101,
        message:
          'Dữ liệu gửi lên không hợp lệ với schema cơ sở dữ liệu.',
        details: { type: 'PrismaClientValidationError' },
      },
    });
  }
}
