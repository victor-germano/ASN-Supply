import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { resolveThrottleIdentity } from './throttle-identity';

/**
 * `ThrottlerGuard` padrão, só trocando "quem é o visitante" — ver
 * `resolveThrottleIdentity`. Lê `INTERNAL_API_KEY` de `process.env`
 * (populado e validado pelo `ConfigModule` antes de qualquer requisição)
 * porque estender o guard com injeção própria exigiria redeclarar o
 * construtor interno do pacote.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return this.identityOf(context.switchToHttp().getRequest<Request>()).skip;
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const identity = this.identityOf(req as unknown as Request);
    return identity.skip ? 'internal' : identity.tracker;
  }

  private identityOf(req: Request) {
    return resolveThrottleIdentity({
      headers: req.headers,
      connectionIp: req.ip,
      internalKey: process.env.INTERNAL_API_KEY,
    });
  }
}
