import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AdminDashboardStats } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminDashboardRepository } from './admin-dashboard.repository';

/** Alimenta `/admin` (Painel) — a primeira tela que um admin vê ao entrar. */
@Controller({ path: 'admin/dashboard', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly repository: AdminDashboardRepository) {}

  @Get()
  getStats(): Promise<AdminDashboardStats> {
    return this.repository.getStats();
  }
}
