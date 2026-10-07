import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { DatabaseImageUploader } from './database-image-uploader';

/** PNG 1x1 transparente — o menor PNG válido possível. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const ID = '0b6f2f2e-6d0f-4a52-9b0e-2f3a7f7f1c11';

function fakePrisma() {
  const create = vi.fn().mockResolvedValue({ id: ID });
  return { prisma: { storedImage: { create } } as unknown as PrismaService, create };
}

describe('DatabaseImageUploader', () => {
  it('guarda os bytes com o tipo detectado e devolve URL pública e dimensões reais', async () => {
    const { prisma, create } = fakePrisma();
    const uploader = new DatabaseImageUploader(prisma, 'https://api.loja.com.br');

    const result = await uploader.upload(PNG_1X1);

    expect(result).toEqual({
      url: `https://api.loja.com.br/uploads/${ID}.png`,
      width: 1,
      height: 1,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { contentType: 'image/png', data: PNG_1X1, width: 1, height: 1 },
      }),
    );
  });

  it('recusa arquivo que não é imagem, mesmo que venha com nome .jpg', async () => {
    const { prisma, create } = fakePrisma();
    const uploader = new DatabaseImageUploader(prisma, 'http://localhost:3400');

    await expect(uploader.upload(Buffer.from('MZ isto é um executável'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa SVG (pode carregar script)', async () => {
    const { prisma } = fakePrisma();
    const uploader = new DatabaseImageUploader(prisma, 'http://localhost:3400');
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');

    await expect(uploader.upload(svg)).rejects.toBeInstanceOf(BadRequestException);
  });
});
