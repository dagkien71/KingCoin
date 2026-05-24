import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SkipAuth } from '@modules/auth/skip-auth.guard';

@ApiTags('Upload')
@Controller()
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @SkipAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        folder: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: any) {
    return this.cloudinaryService.uploadImage(file);
  }
}
