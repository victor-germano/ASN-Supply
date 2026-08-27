import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AdminUserListItem, AuthenticatedUser, PaginatedResult } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminUsersRepository } from './admin-users.repository';
import { ListAdminUsersQueryDto } from './dto/list-admin-users.query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller({ path: 'admin/users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly repository: AdminUsersRepository) {}

  @Get()
  findAll(@Query() query: ListAdminUsersQueryDto): Promise<PaginatedResult<AdminUserListItem>> {
    return this.repository.findAll(query);
  }

  /**
   * Substitui `scripts/promote-to-admin.ts` como forma principal de gerir
   * papéis — o script continua funcionando (mesma escrita direto no banco),
   * mas fora do primeiro admin (que precisa ser promovido antes de qualquer
   * painel existir pra ele entrar), esta rota é o caminho normal.
   *
   * Barra alterar o PRÓPRIO papel: sem isso, um admin sozinho na conta
   * conseguiria se rebaixar sem querer e ficar trancado pra fora do próprio
   * painel — só outro admin pode rebaixar alguém, nunca a própria conta.
   */
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AdminUserListItem> {
    if (id === currentUser.id) {
      throw new BadRequestException({
        errorCode: 'CANNOT_CHANGE_OWN_ROLE',
        message: 'Você não pode alterar o próprio papel — peça a outro admin.',
      });
    }
    return this.repository.updateRole(id, dto.role);
  }
}
