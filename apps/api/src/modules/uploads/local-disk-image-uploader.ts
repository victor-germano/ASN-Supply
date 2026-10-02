import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { imageSize } from 'image-size';
import { ImageUploader, type UploadedImage } from './image-uploader';

/** Pasta (relativa a `apps/api`) servida em `/uploads` por `main.ts` — ignorada pelo git. */
export const LOCAL_UPLOADS_DIR = 'uploads';

const EXTENSION_BY_TYPE: Record<string, string> = {
  jpg: '.jpg',
  png: '.png',
  webp: '.webp',
  gif: '.gif',
  avif: '.avif',
};

/**
 * Adapter de DESENVOLVIMENTO — ativo só sem `CLOUDINARY_URL` e fora de
 * produção (ver `uploads.module.ts`). Grava o arquivo no disco da própria
 * API pra o painel admin poder ser testado de ponta a ponta (enviar foto,
 * ver na loja) sem conta na Cloudinary. Nunca em produção: hospedagens
 * apagam o disco a cada deploy, e as fotos dos produtos sumiriam.
 *
 * O tipo vem dos bytes do arquivo (`image-size`), não do nome nem do
 * `Content-Type` enviado — um `.exe` renomeado pra `.jpg` é recusado, e
 * nenhum nome escolhido por quem envia chega ao disco (sempre um UUID).
 */
@Injectable()
export class LocalDiskImageUploader extends ImageUploader {
  constructor(private readonly publicBaseUrl: string) {
    super();
  }

  async upload(file: Buffer): Promise<UploadedImage> {
    let dimensions: { width: number; height: number; type?: string };
    try {
      dimensions = imageSize(file);
    } catch {
      throw invalidImage();
    }
    const extension = dimensions.type ? EXTENSION_BY_TYPE[dimensions.type] : undefined;
    if (!extension) throw invalidImage();

    const filename = `${randomUUID()}${extension}`;
    await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    await writeFile(join(LOCAL_UPLOADS_DIR, filename), file);

    return {
      url: `${this.publicBaseUrl}/uploads/${filename}`,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
}

function invalidImage(): BadRequestException {
  return new BadRequestException({
    errorCode: 'INVALID_FILE_TYPE',
    message: 'Envie um arquivo de imagem (JPG, PNG, WEBP, GIF ou AVIF).',
  });
}
