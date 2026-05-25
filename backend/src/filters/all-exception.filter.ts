import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { INTERNAL_SERVER_ERROR } from '@constants/errors.constants';
import { parseCodedMessage } from '@common/errors/app-error.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let rawMessage = INTERNAL_SERVER_ERROR;
      if (typeof body === 'string') {
        rawMessage = body;
      } else if (body && typeof body === 'object') {
        const msg = (body as { message?: string | string[] }).message;
        if (typeof msg === 'string') rawMessage = msg;
        else if (Array.isArray(msg) && msg[0]) rawMessage = String(msg[0]);
        if (
          (body as { success?: boolean; error?: { message?: string } })
            .success === false &&
          (body as { error?: { message?: string } }).error?.message
        ) {
          return res.status(status).json(body);
        }
      }
      const parsed = parseCodedMessage(rawMessage);
      const [fallbackCode] = INTERNAL_SERVER_ERROR.split(':');
      return res.status(status).json({
        success: false,
        error: {
          code: parsed.code ?? Number.parseInt(fallbackCode, 10),
          message: parsed.message,
          details: typeof body === 'object' ? body : undefined,
        },
      });
    }

    const [serverErrorCode, serverMsg] = INTERNAL_SERVER_ERROR.split(':');
    let message = serverMsg?.trim() ?? 'Internal server error';
    if (exception instanceof Error && exception.message?.trim()) {
      this.logger.error(exception.message, exception.stack);
      message =
        'Lỗi hệ thống nội bộ. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
    } else {
      this.logger.error(exception, 'AllExceptionsFilter');
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: Number.parseInt(serverErrorCode, 10),
        message,
      },
    });
  }
}
