import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';
import { UploadImageService } from './upload-image.service';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
  ],
  controllers: [UploadController],
  providers: [UploadImageService],
})
export class UploadModule {}
