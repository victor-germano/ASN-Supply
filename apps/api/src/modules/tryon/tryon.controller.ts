import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { TryOnAnalysisResult, TryOnConfig } from '@asn/types';
import { TryOnService } from './tryon.service';
import { AnalyzeTryOnDto } from './dto/analyze-tryon.dto';

@Controller({ path: 'tryon', version: '1' })
export class TryOnController {
  constructor(private readonly service: TryOnService) {}

  /** Como o Provador está funcionando neste ambiente (com ou sem análise de foto). */
  @Get('config')
  config(): TryOnConfig {
    return this.service.config();
  }

  /** Provador Digital (Módulo 7) — parecer de estilo/caimento para um produto. */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  // Endpoint custoso (payload de imagem + chamada à Anthropic quando há
  // chave) — limite mais restrito que o padrão global, mesmo espírito do
  // checkout.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyze(@Body() dto: AnalyzeTryOnDto): Promise<TryOnAnalysisResult> {
    return this.service.analyze(dto);
  }
}
