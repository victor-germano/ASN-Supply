import { IsIn } from 'class-validator';
import type { UserRole } from '@asn/types';

const ROLES: UserRole[] = ['CUSTOMER', 'ADMIN', 'SUPPORT'];

export class UpdateUserRoleDto {
  @IsIn(ROLES)
  role!: UserRole;
}
