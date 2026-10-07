import { BadRequestException, Injectable } from '@nestjs/common';
import { imageSize } from 'image-size';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploader, type UploadedImage } from './image-uploader';

/** Caminho público (sem `/v1`) em que `StoredImagesController` serve os arquivos. */
export const STORED_IMAGES_PATH = 'uploads';

const FORMAT_BY_TYPE: Record<string, { extension: string; contentType: string }> = {
  jpg: { extension: '.jpg', contentType: 'image/jpeg' },
  png: { extension: '.png', contentType: 'image/png' },
  webp: { extension: '.webp', contentType: 'image/webp' },
  gif: { extension: '.gif', contentType: 'image/gif' },
  avif: { extension: '.avif', contentType: 'image/avif' },
};

/**
 * Adapter usado sem `CLOUDINARY_URL`: guarda a imagem no próprio Postgres
 * da loja (tabela `stored_images`) e devolve uma URL servida pela API. Faz
 * o painel funcionar em qualquer hospedagem sem conta em serviço externo —
 * o disco de um servidor hospedado é apagado a cada deploy, o banco não.
 * Para um catálogo de loja pequena o volume é irrisório; se um dia pesar,
 * basta configurar a Cloudinary (as imagens antigas continuam servidas).
 *
 * O tipo vem dos bytes do arquivo (`image-size`), não do nome nem do
 * `Content-Type` enviado — um `.exe` renomeado pra `.jpg` é recusado, o
 * `Content-Type` servido depois é o que detectamos aqui, e SVG (que pode
 * carregar script) não entra na lista.
 */
@Injectable()
export class DatabaseImageUploader extends ImageUploader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicBaseUrl: string,
  ) {
    super();
  }

  async upload(file: Buffer): Promise<UploadedImage> {
    let dimensions: { width: number; height: number; type?: string };
    try {
      dimensions = imageSize(file);
    } catch {
      throw invalidImage();
    }
    const format = dimensions.type ? FORMAT_BY_TYPE[dimensions.type] : undefined;
    if (!format) throw invalidImage();

    const stored = await this.prisma.storedImage.create({
      data: {
        contentType: format.contentType,
        data: file,
        width: dimensions.width,
        height: dimensions.height,
      },
      select: { id: true },
    });

    return {
      url: `${this.publicBaseUrl}/${STORED_IMAGES_PATH}/${stored.id}${format.extension}`,
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
