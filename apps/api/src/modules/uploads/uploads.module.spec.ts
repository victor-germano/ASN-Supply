import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { createImageUploader } from './uploads.module';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';

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
      fakeConfig({ CLOUDINARY_URL: 'cloudinary://key:secret@cloud' }),
    );
    expect(uploader).toBeInstanceOf(CloudinaryImageUploader);
  });

  it('falha rápido e alto sem CLOUDINARY_URL', () => {
    expect(() => createImageUploader(fakeConfig({}))).toThrow(/CLOUDINARY_URL/);
  });
});
