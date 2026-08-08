import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvConfig } from '../../config/env.validation';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Protege rotas administrativas (Módulo 6, ainda não implementado — o
 * usuário pediu para pular o painel por ora, só deixar a base pronta).
 * Mesmo padrão já validado no outro projeto deste usuário
 * (agente-emissao-nf/src/api/requireApiKey.ts): Bearer token comparado em
 * tempo constante contra `ADMIN_API_KEY`, para não vazar por timing se
 * algum dia um bearer quase certo for tentado.
 *
 * Sem `ADMIN_API_KEY` configurada vira passthrough (com aviso único no
 * log) — permite rodar a API localmente antes de o painel existir sem
 * exigir uma variável de ambiente que nada usa ainda. Isto é aceitável
 * hoje porque NENHUM controller aplica este guard; no dia em que o
 * primeiro endpoint administrativo real for escrito, configurar
 * `ADMIN_API_KEY` deixa de ser opcional na prática.
 *
 * Troca por autenticação de verdade (sessão/JWT + `Role.ADMIN`, quando a
 * Área do Cliente/Módulo 5 existir) é decidir substituir só este guard —
 * nenhum controller que já usa `@UseGuards(AdminAuthGuard)` muda.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);
  private hasWarnedMissingKey = false;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.config.get('ADMIN_API_KEY', { infer: true });

    if (!apiKey) {
      if (!this.hasWarnedMissingKey) {
        this.logger.warn(
          'ADMIN_API_KEY não configurada — rotas administrativas ficariam sem proteção. Defina antes de expor qualquer endpoint administrativo fora do desenvolvimento local.',
        );
        this.hasWarnedMissingKey = true;
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token || !safeEqual(token, apiKey)) {
      throw new UnauthorizedException({
        errorCode: 'ADMIN_UNAUTHORIZED',
        message: 'Credenciais administrativas inválidas.',
      });
    }

    return true;
  }
}
