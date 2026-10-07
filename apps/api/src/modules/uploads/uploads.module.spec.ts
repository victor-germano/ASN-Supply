import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import type { PrismaService } from '../prisma/prisma.service';
import { createImageUploader } from './uploads.module';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';
import { DatabaseImageUploader } from './database-image-uploader';

function fakeConfig(
  values: Partial<Record<keyof EnvConfig, unknown>>,
): ConfigService<EnvConfig, true> {
  return {
    get: (key: keyof EnvConfig) => values[key],
  } as unknown as ConfigService<EnvConfig, true>;
}

const prisma = {} as PrismaService;

describe('createImageUploader', () => {
  it('escolhe CloudinaryImageUploader quando CLOUDINARY_URL está configurada', () => {
    const uploader = createImageUploader(
      fakeConfig({ CLOUDINARY_URL: 'cloudinary://key:secret@cloud', NODE_ENV: 'production' }),
      prisma,
    );
    expect(uploader).toBeInstanceOf(CloudinaryImageUploader);
  });

  it('sem Cloudinary, guarda no banco — em desenvolvimento e em produção', () => {
    for (const NODE_ENV of ['development', 'production']) {
      const uploader = createImageUploader(fakeConfig({ NODE_ENV, PORT: 3400 }), prisma);
      expect(uploader).toBeInstanceOf(DatabaseImageUploader);
    }
  });
});
