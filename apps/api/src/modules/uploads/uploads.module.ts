import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsController } from './uploads.controller';
import { StoredImagesController } from './stored-images.controller';
import { ImageUploader } from './image-uploader';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';
import { DatabaseImageUploader } from './database-image-uploader';

/**
 * Mesmo padrão de `createEmailSender`/`createTryOnAnalyzer` — escolhe o
 * adapter em runtime pela env var presente. Sem Cloudinary, as imagens vão
 * para o banco da própria loja (ver `DatabaseImageUploader`), em
 * desenvolvimento e em produção: o envio pelo painel funciona sempre.
 */
export function createImageUploader(
  config: ConfigService<EnvConfig, true>,
  prisma: PrismaService,
): ImageUploader {
  if (config.get('CLOUDINARY_URL', { infer: true })) return new CloudinaryImageUploader();
  const publicBaseUrl =
    config.get('API_PUBLIC_URL', { infer: true }) ??
    `http://localhost:${config.get('PORT', { infer: true })}`;
  return new DatabaseImageUploader(prisma, publicBaseUrl.replace(/\/+$/, ''));
}

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [UploadsController, StoredImagesController],
  providers: [
    {
      provide: ImageUploader,
      useFactory: createImageUploader,
      inject: [ConfigService, PrismaService],
    },
  ],
})
export class UploadsModule {}
