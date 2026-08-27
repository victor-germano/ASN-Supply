import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from 'cloudinary';
import { ImageUploader, type UploadedImage } from './image-uploader';

/**
 * Adapter real — ativo quando `CLOUDINARY_URL` está configurada (ver
 * `uploads.module.ts`). O SDK da Cloudinary lê `CLOUDINARY_URL` sozinho
 * (`cloudinary.config()` sem argumento faz o parse automático dela) —
 * nada pra configurar manualmente aqui além de garantir que a env existe.
 */
@Injectable()
export class CloudinaryImageUploader extends ImageUploader {
  private readonly logger = new Logger(CloudinaryImageUploader.name);

  constructor() {
    super();
    cloudinary.config({ secure: true });
  }

  upload(file: Buffer, filename: string): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // Pasta própria — não polui a raiz da conta com o resto do que
          // porventura seja usado ali pra outros projetos.
          folder: 'asn-supply',
          filename_override: filename,
          resource_type: 'image',
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(
              `Falha ao enviar imagem "${filename}" pra Cloudinary: ${error?.message}`,
            );
            reject(
              new InternalServerErrorException({
                errorCode: 'IMAGE_UPLOAD_FAILED',
                message: 'Não foi possível enviar a imagem agora.',
              }),
            );
            return;
          }
          resolve({ url: result.secure_url, width: result.width, height: result.height });
        },
      );
      stream.end(file);
    });
  }
}
