import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
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
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
