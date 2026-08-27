import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { UnavailableImageUploader } from './unavailable-image-uploader';

describe('UnavailableImageUploader', () => {
  it('lança 503 em vez de fingir um upload que não aconteceu', async () => {
    const uploader = new UnavailableImageUploader();
    await expect(uploader.upload()).rejects.toThrow(ServiceUnavailableException);
  });
});
