import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { ImageUploader } from './image-uploader';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';
import { UnavailableImageUploader } from './unavailable-image-uploader';

/** Mesmo padrão de `createEmailSender`/`createTryOnAnalyzer` — escolhe o adapter em runtime pela env var presente. */
export function createImageUploader(config: ConfigService<EnvConfig, true>): ImageUploader {
  return config.get('CLOUDINARY_URL', { infer: true })
    ? new CloudinaryImageUploader()
    : new UnavailableImageUploader();
}

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [UploadsController],
  providers: [{ provide: ImageUploader, useFactory: createImageUploader, inject: [ConfigService] }],
})
export class UploadsModule {}
