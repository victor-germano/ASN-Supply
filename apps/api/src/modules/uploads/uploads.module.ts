import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { ImageUploader } from './image-uploader';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';
import { UnavailableImageUploader } from './unavailable-image-uploader';
import { LocalDiskImageUploader } from './local-disk-image-uploader';

/**
 * Mesmo padrão de `createEmailSender`/`createTryOnAnalyzer` — escolhe o
 * adapter em runtime pela env var presente. Sem Cloudinary: disco local em
 * desenvolvimento (painel testável de ponta a ponta), erro claro em
 * produção (ver `LocalDiskImageUploader` sobre o porquê).
 */
export function createImageUploader(config: ConfigService<EnvConfig, true>): ImageUploader {
  if (config.get('CLOUDINARY_URL', { infer: true })) return new CloudinaryImageUploader();
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    return new LocalDiskImageUploader(`http://localhost:${config.get('PORT', { infer: true })}`);
  }
  return new UnavailableImageUploader();
}

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [UploadsController],
  providers: [{ provide: ImageUploader, useFactory: createImageUploader, inject: [ConfigService] }],
})
export class UploadsModule {}
