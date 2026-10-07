import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TryOnController } from './tryon.controller';
import { TryOnService } from './tryon.service';
import { TryOnAnalyzer } from './tryon-analyzer';
import { StyleGuideTryOnAnalyzer } from './style-guide-tryon-analyzer';
import { ClaudeTryOnAnalyzer } from './claude-tryon-analyzer';
import { CatalogModule } from '../catalog/catalog.module';
import type { EnvConfig } from '../../config/env.validation';

/**
 * Escolhe o adapter em runtime a partir de `ASN_ANTHROPIC_API_KEY`: com a chave
 * configurada, análise da foto via Claude; sem ela, o guia de estilo e medida da loja
 * (sem foto) — o Provador funciona nos dois casos. Mesmo espírito
 * do padrão porta/adapter já usado em `PaymentGateway`/`NullPaymentGateway`
 * (`payments.module.ts`), só que com a escolha condicionada à env var em vez
 * de fixa no `useClass`.
 */
export function createTryOnAnalyzer(config: ConfigService<EnvConfig, true>): TryOnAnalyzer {
  return config.get('ASN_ANTHROPIC_API_KEY', { infer: true })
    ? new ClaudeTryOnAnalyzer(config)
    : new StyleGuideTryOnAnalyzer();
}

@Module({
  imports: [CatalogModule],
  controllers: [TryOnController],
  providers: [
    TryOnService,
    { provide: TryOnAnalyzer, useFactory: createTryOnAnalyzer, inject: [ConfigService] },
  ],
})
export class TryOnModule {}
