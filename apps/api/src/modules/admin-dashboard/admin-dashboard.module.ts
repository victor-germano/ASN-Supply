import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardRepository } from './admin-dashboard.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardRepository],
})
export class AdminDashboardModule {}
