import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import { memoryStorage } from 'multer';
import {
  UploadImageService,
  type UploadedImageFile,
} from './upload-image.service';

@ApiTags('Upload')
@Controller()
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadImageService: UploadImageService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @SkipAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: UploadedImageFile) {
    return this.uploadImageService.upload(file);
  }
}
