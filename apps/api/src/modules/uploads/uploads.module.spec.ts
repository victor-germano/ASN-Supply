import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { createImageUploader } from './uploads.module';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';
import { UnavailableImageUploader } from './unavailable-image-uploader';
import { LocalDiskImageUploader } from './local-disk-image-uploader';

function fakeConfig(
  values: Partial<Record<keyof EnvConfig, unknown>>,
): ConfigService<EnvConfig, true> {
  return {
    get: (key: keyof EnvConfig) => values[key],
  } as unknown as ConfigService<EnvConfig, true>;
}

describe('createImageUploader', () => {
  it('escolhe CloudinaryImageUploader quando CLOUDINARY_URL está configurada', () => {
    const uploader = createImageUploader(
      fakeConfig({ CLOUDINARY_URL: 'cloudinary://key:secret@cloud', NODE_ENV: 'production' }),
    );
    expect(uploader).toBeInstanceOf(CloudinaryImageUploader);
  });

  it('sem Cloudinary em desenvolvimento, grava no disco local (painel testável)', () => {
    const uploader = createImageUploader(fakeConfig({ NODE_ENV: 'development', PORT: 3400 }));
    expect(uploader).toBeInstanceOf(LocalDiskImageUploader);
  });

  it('sem Cloudinary em produção, recusa com erro claro (disco de hospedagem não persiste)', () => {
    const uploader = createImageUploader(fakeConfig({ NODE_ENV: 'production' }));
    expect(uploader).toBeInstanceOf(UnavailableImageUploader);
  });
});
