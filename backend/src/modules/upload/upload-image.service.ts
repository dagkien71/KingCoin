import { CloudinaryService } from '@modules/cloudinary/cloudinary.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export type UploadImageResult = {
  url: string;
  secure_url: string;
  storage: 'cloudinary' | 'local';
};

/** File từ multer memory storage */
export type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

@Injectable()
export class UploadImageService {
  private readonly logger = new Logger(UploadImageService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor(private readonly cloudinary: CloudinaryService) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private isCloudinaryConfigured(): boolean {
    return Boolean(
      process.env.CLD_CLOUD_NAME &&
        process.env.CLD_API_KEY &&
        process.env.CLD_API_SECRET,
    );
  }

  private publicApiBase(): string {
    const port = Number(process.env.APP_PORT || process.env.PORT || 3001);
    const raw =
      process.env.APP_PUBLIC_URL ||
      process.env.BASE_URL ||
      `http://localhost:${port}`;
    return raw.replace(/\/$/, '');
  }

  private validateFile(file: UploadedImageFile | undefined): UploadedImageFile {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh.');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException(
        'Không đọc được file ảnh. Thử chọn lại hoặc dùng ảnh nhỏ hơn 5MB.',
      );
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.',
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('Ảnh tối đa 5MB.');
    }
    return file;
  }

  private uploadLocal(file: UploadedImageFile): UploadImageResult {
    const ext = extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.png';
    const filename = `${randomUUID()}${safeExt}`;
    const filepath = join(this.uploadDir, filename);
    writeFileSync(filepath, file.buffer);
    const url = `${this.publicApiBase()}/api/v1/uploads/${filename}`;
    return { url, secure_url: url, storage: 'local' };
  }

  private normalizeCloudinaryResult(
    result: UploadApiResponse,
  ): UploadImageResult {
    const url = result.secure_url ?? result.url;
    if (!url) {
      throw new BadRequestException('Upload thất bại — không nhận được URL ảnh.');
    }
    return { url, secure_url: url, storage: 'cloudinary' };
  }

  async upload(
    file: UploadedImageFile | undefined,
  ): Promise<UploadImageResult> {
    const valid = this.validateFile(file);

    if (!this.isCloudinaryConfigured()) {
      this.logger.log(
        'Cloudinary chưa cấu hình (CLD_*) — lưu logo vào thư mục uploads/',
      );
      return this.uploadLocal(valid);
    }

    try {
      const result = await this.cloudinary.uploadImage(valid);
      return this.normalizeCloudinaryResult(result as UploadApiResponse);
    } catch (err) {
      this.logger.warn(
        `Cloudinary lỗi (${(err as Error).message}) — fallback local uploads/`,
      );
      return this.uploadLocal(valid);
    }
  }
}
