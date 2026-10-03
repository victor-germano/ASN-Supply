import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Observable } from 'rxjs';
import type { Request } from 'express';
import type { EnvConfig } from '../../../config/env.validation';
import { safeAfterLoginPath } from '../../../common/utils/safe-redirect';

/**
 * Barra `GET /auth/google` e `/auth/google/callback` ANTES de qualquer
 * redirect real acontecer quando `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET` não
 * estão configuradas — sem isso, `GoogleStrategy` (registrada com
 * credenciais placeholder nesse caso) mandaria o navegador pro Google com
 * um client id falso, que falharia do lado de lá com um erro genérico e
 * confuso. 503 explícito aqui é bem mais claro sobre o que está faltando.
 *
 * `state` (o `?next=` de onde o login começou) é repassado como opção do
 * Passport pra sobreviver o roundtrip até o Google e voltar no callback —
 * é assim que `AuthController.googleCallback` sabe pra onde redirecionar
 * de volta na Web depois de logar.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (
      !this.config.get('GOOGLE_OAUTH_CLIENT_ID', { infer: true }) ||
      !this.config.get('GOOGLE_OAUTH_CLIENT_SECRET', { infer: true })
    ) {
      throw new ServiceUnavailableException({
        errorCode: 'GOOGLE_OAUTH_NOT_CONFIGURED',
        message: 'Login com Google ainda não está configurado neste ambiente.',
      });
    }
    return super.canActivate(context);
  }

  override getAuthenticateOptions(context: ExecutionContext): { state: string } {
    const request = context.switchToHttp().getRequest<Request>();
    // Só um caminho interno vira `state` — mesma defesa contra open redirect
    // do `LoginForm`, porque `googleCallback` usa este valor pra montar um
    // redirect de verdade.
    return { state: safeAfterLoginPath(request.query.next) };
  }
}
