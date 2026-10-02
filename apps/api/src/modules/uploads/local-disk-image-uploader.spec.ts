import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LOCAL_UPLOADS_DIR, LocalDiskImageUploader } from './local-disk-image-uploader';

/** PNG 1x1 transparente — o menor PNG válido possível. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('LocalDiskImageUploader', () => {
  let originalCwd: string;
  let workDir: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    workDir = await mkdtemp(join(tmpdir(), 'asn-uploads-'));
    process.chdir(workDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  it('grava a imagem com nome aleatório e devolve URL pública e dimensões reais', async () => {
    const uploader = new LocalDiskImageUploader('http://localhost:3400');

    const result = await uploader.upload(PNG_1X1);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.url).toMatch(/^http:\/\/localhost:3400\/uploads\/[0-9a-f-]{36}\.png$/);
    const saved = await readFile(join(LOCAL_UPLOADS_DIR, result.url.split('/uploads/')[1]!));
    expect(saved.equals(PNG_1X1)).toBe(true);
  });

  it('recusa arquivo que não é imagem, mesmo que venha com nome .jpg', async () => {
    const uploader = new LocalDiskImageUploader('http://localhost:3400');

    await expect(uploader.upload(Buffer.from('MZ isto é um executável'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
