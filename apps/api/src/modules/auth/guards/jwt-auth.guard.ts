import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige `Authorization: Bearer <access token>` válido — 401 se ausente/inválido. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
