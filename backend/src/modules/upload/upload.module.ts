import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryService } from '@modules/cloudinary/cloudinary.service';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, CloudinaryService],
})
export class UploadModule {}
