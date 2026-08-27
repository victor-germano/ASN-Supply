import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ImageUploader, type UploadedImage } from './image-uploader';

/** Fallback sem `CLOUDINARY_URL` configurada — ver comentário em `ImageUploader` sobre por que este erro claro em vez de um resultado silencioso. */
@Injectable()
export class UnavailableImageUploader extends ImageUploader {
  async upload(): Promise<UploadedImage> {
    throw new ServiceUnavailableException({
      errorCode: 'IMAGE_UPLOAD_NOT_CONFIGURED',
      message: 'Upload de imagem ainda não está configurado — cole uma URL diretamente.',
    });
  }
}
