import { CloudinaryService } from '@modules/cloudinary/cloudinary.service';
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UploadService {
  constructor(private cloudinary: CloudinaryService) {}
  async uploadImageToCloudinary(file: any) {
    return await this.cloudinary.uploadImage(file).catch(() => {
      throw new BadRequestException('Invalid file type.');
    });
  }
}
