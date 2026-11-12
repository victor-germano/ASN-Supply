import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { ImageUploader } from './image-uploader';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';

/**
 * Upload de imagem do painel admin — só Cloudinary desde a Fase 7 da
 * migração (ver C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md):
 * o fallback que guardava a imagem no Postgres (`DatabaseImageUploader`)
 * saiu junto com o resto do Prisma. Falha rápido e alto na inicialização
 * (mesmo espírito de `firebase-admin.ts`/`validateEnv`) se `CLOUDINARY_URL`
 * não estiver configurada — melhor um erro claro ao subir do que a rota de
 * upload quebrando silenciosamente na primeira tentativa.
 */
export function createImageUploader(config: ConfigService<EnvConfig, true>): ImageUploader {
  if (!config.get('CLOUDINARY_URL', { infer: true })) {
    throw new Error(
      'CLOUDINARY_URL não configurada — obrigatória para o upload de imagem do painel admin.',
    );
  }
  return new CloudinaryImageUploader();
}

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [UploadsController],
  providers: [
    {
      provide: ImageUploader,
      useFactory: createImageUploader,
      inject: [ConfigService],
    },
  ],
})
export class UploadsModule {}
