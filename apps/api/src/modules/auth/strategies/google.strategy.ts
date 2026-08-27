import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import type { EnvConfig } from '../../../config/env.validation';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Registrada incondicionalmente (Nest exige um provider concreto), mas com
 * `clientID`/`clientSecret` placeholder quando não configuradas — nunca
 * chega a ser usada nesse caso porque `GoogleAuthGuard` barra a rota antes
 * de qualquer redirect real acontecer (ver comentário lá). Sem essa
 * guarda, um redirect com credenciais falsas chegaria ao Google e falharia
 * lá, com um erro genérico e confuso em vez do 503 claro que temos aqui.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<EnvConfig, true>) {
    super({
      clientID: config.get('GOOGLE_OAUTH_CLIENT_ID', { infer: true }) || 'not-configured',
      clientSecret: config.get('GOOGLE_OAUTH_CLIENT_SECRET', { infer: true }) || 'not-configured',
      callbackURL: config.get('GOOGLE_OAUTH_CALLBACK_URL', { infer: true }),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Conta do Google sem e-mail público — não é possível continuar.'));
      return;
    }
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, googleProfile);
  }
}
