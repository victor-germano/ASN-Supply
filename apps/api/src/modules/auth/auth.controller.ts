import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, AuthenticatedUser } from '@asn/types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  // Escrita pública que cria conta + hasheia senha (bcrypt é
  // deliberadamente caro) — throttle mais restrito que o padrão global,
  // mesmo espírito de `POST /orders`.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.service.register(dto);
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
    await this.service.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthResponse> {
    return this.service.resetPassword(dto.token, dto.newPassword);
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
}
