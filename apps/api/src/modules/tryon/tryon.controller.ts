import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { TryOnAnalysisResult } from '@asn/types';
import { TryOnService } from './tryon.service';
import { AnalyzeTryOnDto } from './dto/analyze-tryon.dto';

@Controller({ path: 'tryon', version: '1' })
export class TryOnController {
  constructor(private readonly service: TryOnService) {}

  /** Provador Digital (Módulo 7) — parecer de estilo/caimento a partir de uma foto + produto. */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  // Endpoint custoso (payload de imagem + futura chamada à Anthropic) —
  // limite mais restrito que o padrão global, mesmo espírito do checkout.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyze(@Body() dto: AnalyzeTryOnDto): Promise<TryOnAnalysisResult> {
    return this.service.analyze(dto.photoBase64, dto.productId);
  }
}
