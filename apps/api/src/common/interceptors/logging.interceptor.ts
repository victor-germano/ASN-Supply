import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, tap } from 'rxjs';

/**
 * Loga método, rota e latência de cada requisição — observabilidade mínima
 * necessária para operar em produção sem instrumentação de APM ainda.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(`${method} ${originalUrl} +${durationMs}ms`);
      }),
    );
  }
}
