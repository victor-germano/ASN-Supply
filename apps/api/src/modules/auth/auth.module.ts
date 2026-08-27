import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import type { EnvConfig } from '../../config/env.validation';

/**
 * `JwtStrategy` valida access tokens (`Authorization: Bearer`); `AuthService`
 * assina os dois tipos (access/refresh) com o mesmo `JWT_SECRET` — por isso
 * o `secret` aqui no `JwtModule` cobre a verificação automática que a
 * strategy faz, e o `AuthService` reusa o mesmo `JWT_SECRET` manualmente
 * para assinar/verificar o refresh token, que passa fora do fluxo padrão de
 * `Authorization` header.
 *
 * `JwtAuthGuard`/`OptionalJwtAuthGuard`/`RolesGuard` são exportados para
 * outros módulos (`OrdersModule`, e futuramente as rotas administrativas)
 * reusarem sem reimplementar guard nenhum.
 *
 * `GoogleStrategy`/`GoogleAuthGuard` (login social) não são exportados —
 * só o próprio `AuthController` usa (`GET /auth/google`, `/callback`).
 * Registrados incondicionalmente mesmo sem `GOOGLE_OAUTH_CLIENT_ID`/
 * `_SECRET` configuradas (Nest exige um provider concreto); é o guard,
 * não a ausência do provider, que barra a rota nesse caso — ver comentário
 * em `GoogleAuthGuard`.
 */
@Module({
  imports: [
    UsersModule,
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    GoogleAuthGuard,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
