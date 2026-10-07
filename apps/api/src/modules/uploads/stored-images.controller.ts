import { Controller, Get, NotFoundException, Param, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { STORED_IMAGES_PATH } from './database-image-uploader';

const FILENAME_PATTERN = /^([0-9a-f-]{36})\.(jpg|png|webp|gif|avif)$/;

/**
 * Serve as imagens guardadas por `DatabaseImageUploader`. Público (fotos de
 * produto), fora do `/v1` (a URL fica gravada no catálogo — não deve mudar
 * com a versão da API) e sem rate limit: quem busca aqui é quase sempre o
 * otimizador de imagens do site, a partir de um IP só.
 */
@Controller({ path: STORED_IMAGES_PATH, version: VERSION_NEUTRAL })
@SkipThrottle()
export class StoredImagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':filename')
  async serve(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    const id = FILENAME_PATTERN.exec(filename)?.[1];
    const image = id
      ? await this.prisma.storedImage.findUnique({
          where: { id },
          select: { contentType: true, data: true },
        })
      : null;
    if (!image) {
      throw new NotFoundException({
        errorCode: 'IMAGE_NOT_FOUND',
        message: 'Imagem não encontrada.',
      });
    }

    res
      .status(200)
      .set({
        'Content-Type': image.contentType,
        // O conteúdo de um id nunca muda (cada envio gera um id novo).
        'Cache-Control': 'public, max-age=31536000, immutable',
        // O site roda em outra origem e exibe estas imagens; o padrão do
        // helmet (`same-origin`) faria o navegador bloquear.
        'Cross-Origin-Resource-Policy': 'cross-origin',
      })
      .send(Buffer.from(image.data));
  }
}
