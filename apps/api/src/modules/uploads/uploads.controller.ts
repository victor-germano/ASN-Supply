import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImageUploader, type UploadedImage } from './image-uploader';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Usado pelo formulário de produto/marca/categoria/coleção do painel
 * admin como alternativa a colar uma URL — nunca a única forma: sem
 * `CLOUDINARY_URL` configurada, `ImageUploader` (via
 * `UnavailableImageUploader`) rejeita com uma mensagem clara, e o campo
 * de URL continua funcionando normalmente. `memoryStorage()` (não o
 * padrão em disco do multer) porque `ImageUploader.upload` espera um
 * `Buffer` — o arquivo nunca toca o disco da API, só passa em memória a
 * caminho da Cloudinary.
 */
@Controller({ path: 'admin/uploads', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UploadsController {
  constructor(private readonly uploader: ImageUploader) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<UploadedImage> {
    if (!file) {
      throw new BadRequestException({
        errorCode: 'FILE_REQUIRED',
        message: 'Selecione um arquivo de imagem.',
      });
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException({
        errorCode: 'INVALID_FILE_TYPE',
        message: 'Envie um arquivo de imagem (PNG, JPG, WEBP...).',
      });
    }
    return this.uploader.upload(file.buffer, file.originalname);
  }
}
