import { Prisma } from '@prisma/client';

/** Thông báo tiếng Việt theo mã Prisma — không lộ raw engine message. */
export function prismaErrorMessage(
  code: string,
  meta?: Prisma.PrismaClientKnownRequestError['meta'],
): string {
  switch (code) {
    case 'P2000':
      return 'Giá trị vượt quá độ dài cho phép của trường dữ liệu.';
    case 'P2001':
      return 'Không tìm thấy bản ghi theo điều kiện truy vấn.';
    case 'P2002': {
      const target = meta?.target;
      const fields = Array.isArray(target)
        ? target.join(', ')
        : typeof target === 'string'
          ? target
          : '';
      return fields
        ? `Dữ liệu trùng lặp (${fields}).`
        : 'Dữ liệu đã tồn tại (trùng khóa duy nhất).';
    }
    case 'P2003':
      return 'Thao tác không hợp lệ: dữ liệu liên quan không tồn tại hoặc đã bị xóa.';
    case 'P2011':
      return 'Thiếu giá trị bắt buộc cho trường dữ liệu.';
    case 'P2014':
      return 'Quan hệ dữ liệu không hợp lệ.';
    case 'P2021':
      return 'Bảng dữ liệu không tồn tại trên hệ thống.';
    case 'P2022':
      return 'Cột dữ liệu không tồn tại.';
    case 'P2025':
      return 'Không tìm thấy bản ghi cần thao tác (đã xóa hoặc không tồn tại).';
    case 'P2034':
      return 'Xung đột khi ghi dữ liệu — vui lòng thử lại.';
    default:
      return 'Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.';
  }
}

export function prismaErrorStatus(code: string): number {
  switch (code) {
    case 'P2002':
    case 'P2003':
    case 'P2034':
      return 409;
    case 'P2025':
    case 'P2001':
      return 404;
    case 'P2000':
    case 'P2011':
    case 'P2014':
    case 'P2022':
      return 400;
    default:
      return 400;
  }
}
