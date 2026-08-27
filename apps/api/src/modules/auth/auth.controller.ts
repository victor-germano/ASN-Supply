import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, AuthenticatedUser } from '@asn/types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
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
}
