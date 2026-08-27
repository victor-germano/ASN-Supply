import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@asn/types';

export const ROLES_KEY = 'roles';

/** Usar depois de `@UseGuards(JwtAuthGuard, RolesGuard)` — a ordem importa. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
