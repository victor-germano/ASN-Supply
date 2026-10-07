import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { createTryOnAnalyzer } from './tryon.module';
import { StyleGuideTryOnAnalyzer } from './style-guide-tryon-analyzer';
import { ClaudeTryOnAnalyzer } from './claude-tryon-analyzer';

function fakeConfig(anthropicApiKey: string | undefined): ConfigService<EnvConfig, true> {
  return { get: () => anthropicApiKey } as unknown as ConfigService<EnvConfig, true>;
}

describe('createTryOnAnalyzer', () => {
  it('escolhe StyleGuideTryOnAnalyzer (sem foto) quando ASN_ANTHROPIC_API_KEY não está configurada', () => {
    const analyzer = createTryOnAnalyzer(fakeConfig(undefined));
    expect(analyzer).toBeInstanceOf(StyleGuideTryOnAnalyzer);
    expect(analyzer.usesPhoto).toBe(false);
  });

  it('escolhe ClaudeTryOnAnalyzer quando ASN_ANTHROPIC_API_KEY está configurada', () => {
    const analyzer = createTryOnAnalyzer(fakeConfig('sk-ant-fake-key'));
    expect(analyzer).toBeInstanceOf(ClaudeTryOnAnalyzer);
  });
});
