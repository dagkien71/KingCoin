import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

/** Parse `"404101: Message"` hoặc message thuần. */
export function parseCodedMessage(
  raw: string,
): { code: number | null; message: string } {
  const trimmed = raw?.trim() ?? '';
  const idx = trimmed.indexOf(':');
  if (idx > 0) {
    const codePart = trimmed.slice(0, idx).trim();
    const code = Number.parseInt(codePart, 10);
    if (Number.isFinite(code)) {
      return {
        code,
        message: trimmed.slice(idx + 1).trim() || trimmed,
      };
    }
  }
  return { code: null, message: trimmed || 'Yêu cầu không hợp lệ.' };
}

export function resolveExceptionMessage(
  exception: { getResponse?: () => unknown },
  fallback: string,
): string {
  if (!exception.getResponse) return fallback;
  const response = exception.getResponse();
  if (typeof response === 'string' && response.trim()) {
    return parseCodedMessage(response).message;
  }
  if (response && typeof response === 'object') {
    const msg = (response as { message?: string | string[] }).message;
    if (typeof msg === 'string' && msg.trim()) {
      return parseCodedMessage(msg).message;
    }
    if (Array.isArray(msg) && msg.length > 0) {
      return String(msg[0]);
    }
  }
  return fallback;
}

export function badRequest(message: string): BadRequestException {
  return new BadRequestException(message);
}

export function notFound(message: string): NotFoundException {
  return new NotFoundException(message);
}

export function conflict(message: string): ConflictException {
  return new ConflictException(message);
}
