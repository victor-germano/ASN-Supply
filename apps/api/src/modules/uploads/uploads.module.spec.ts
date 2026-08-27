import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { createImageUploader } from './uploads.module';
import { CloudinaryImageUploader } from './cloudinary-image-uploader';
import { UnavailableImageUploader } from './unavailable-image-uploader';

function fakeConfig(cloudinaryUrl: string | undefined): ConfigService<EnvConfig, true> {
  return { get: () => cloudinaryUrl } as unknown as ConfigService<EnvConfig, true>;
}

describe('createImageUploader', () => {
  it('escolhe UnavailableImageUploader quando CLOUDINARY_URL não está configurada', () => {
    const uploader = createImageUploader(fakeConfig(undefined));
    expect(uploader).toBeInstanceOf(UnavailableImageUploader);
  });

  it('escolhe CloudinaryImageUploader quando CLOUDINARY_URL está configurada', () => {
    const uploader = createImageUploader(fakeConfig('cloudinary://key:secret@cloud'));
    expect(uploader).toBeInstanceOf(CloudinaryImageUploader);
  });
});
