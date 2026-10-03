import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthResponse, AuthenticatedUser } from '@asn/types';
import type { EnvConfig } from '../../config/env.validation';
import { safeAfterLoginPath } from '../../common/utils/safe-redirect';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordWithCodeDto } from './dto/reset-password-with-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { GoogleProfile } from './strategies/google.strategy';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Post('register')
  // Escrita pública que cria conta + hasheia senha (bcrypt é
  // deliberadamente caro) — throttle mais restrito que o padrão global,
  // mesmo espírito de `POST /orders`.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.service.register({ ...dto, marketingOptIn: dto.marketingOptIn === true });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Mais restrito que /register de verdade (o limite era igual antes,
  // apesar do comentário já dizer o contrário) — alvo natural de força
  // bruta contra um e-mail específico, diferente de /register onde o
  // "custo" de cada tentativa já é o de criar uma conta nova.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.service.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.service.refresh(dto.refreshToken);
  }

  /**
   * Sem estado no servidor (ver `AuthService`) — não há nada para revogar
   * aqui. Existe mesmo assim por simetria com login/register e para um
   * futuro log de auditoria; quem efetivamente "desloga" é o Next.js
   * limpando os cookies.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /** Liga/desliga lembretes por SMS — o link "não quero mais" das mensagens leva pra cá. */
  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<AuthenticatedUser> {
    return this.service.updatePreferences(user.id, dto.marketingOptIn);
  }

  /**
   * Sempre 204, exista o e-mail ou não — mesma defesa contra enumeração
   * de `login` (ver `AuthService.requestPasswordReset`). Nunca informa se
   * deu certo de verdade; a UI mostra "se esse e-mail existir, você vai
   * receber um link" independente do resultado real.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.service.requestPasswordReset(dto.email, dto.channel ?? 'email');
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthResponse> {
    return this.service.resetPassword(dto.token, dto.newPassword);
  }

  /**
   * Variante por SMS. Limite baixo por visitante, somado ao teto de 5
   * tentativas por código (ver `PasswordResetCodeService`) — as duas
   * camadas juntas tornam inviável chutar o código de 6 dígitos.
   */
  @Post('reset-password/code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPasswordWithCode(@Body() dto: ResetPasswordWithCodeDto): Promise<AuthResponse> {
    return this.service.resetPasswordWithCode(dto.email, dto.code, dto.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.service.verifyEmail(dto.token);
  }

  /** Autenticado — reenviar é uma ação de quem já está logado mas ainda não confirmou (ver banner em `/conta`). */
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendVerification(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.service.requestEmailVerification(user.id);
  }

  /**
   * Corpo do handler nunca roda de verdade quando as credenciais estão
   * configuradas: `GoogleAuthGuard` (que estende `AuthGuard('google')`)
   * já redireciona o navegador pro Google dentro de `canActivate` — é
   * assim que toda integração Nest+Passport com uma OAuth strategy
   * "redirect-based" funciona. Sem credenciais, o guard barra antes disso
   * com 503 (ver `GoogleAuthGuard`).
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {}

  /**
   * Google redireciona de volta pra cá com um código; `GoogleAuthGuard`
   * já trocou esse código pelo perfil (`GoogleStrategy.validate`) antes
   * do corpo deste handler rodar — chega em `req.user`, não pelo
   * `@CurrentUser()` de sempre (que espera um `AuthenticatedUser`, não um
   * `GoogleProfile` cru). Tokens vão pro `#fragment` da URL (nunca
   * `?query`) porque fragmentos nunca saem do navegador — não aparecem em
   * log de acesso do servidor nem no header `Referer` de terceiros,
   * diferente de uma query string. `WriteReviewForm`/`LoginForm` etc. não
   * se aplicam aqui: quem lê o fragmento e troca pelos cookies httpOnly de
   * verdade é `/auth/google/callback` do lado da Web (Client Component,
   * ver `apps/web`), chamando uma Server Action logo em seguida.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as GoogleProfile;
    const result = await this.service.loginWithGoogle(profile);
    // Revalidado aqui também: o `state` volta pela URL e pode ser forjado.
    const next = safeAfterLoginPath(req.query.state);

    const webAppUrl = this.config.get('WEB_APP_URL', { infer: true });
    const redirectUrl = new URL('/auth/google/callback', webAppUrl);
    redirectUrl.hash = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      next,
    }).toString();
    res.redirect(redirectUrl.toString());
  }
}
