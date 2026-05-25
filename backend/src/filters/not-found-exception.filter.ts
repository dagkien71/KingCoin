import {
  Catch,
  ExceptionFilter,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { NOT_FOUND } from '@constants/errors.constants';
import {
  parseCodedMessage,
  resolveExceptionMessage,
} from '@common/errors/app-error.util';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: any) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    const status: number = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.NOT_FOUND;

    const fallback = NOT_FOUND.split(':')[1]?.trim() ?? 'Not found';
    const rawMessage = resolveExceptionMessage(exception, fallback);
    const parsed = parseCodedMessage(rawMessage);
    const defaultCode = parseCodedMessage(NOT_FOUND).code ?? 404000;

    const exceptionResponse = {
      success: false,
      error: {
        code: parsed.code ?? defaultCode,
        message: parsed.message,
        details: exception.getResponse(),
      },
    };

    return res.status(status).json(exceptionResponse);
  }
}
