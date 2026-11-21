import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AdminBanner } from '@asn/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminBannersRepository } from './admin-banners.repository';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

/** Mesmo mecanismo de `AdminBrandsController`: `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')` direto no controller. */
@Controller({ path: 'admin/banners', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBannersController {
  constructor(private readonly repository: AdminBannersRepository) {}

  @Get()
  findAll(): Promise<AdminBanner[]> {
    return this.repository.findAll();
  }

  @Post()
  create(@Body() dto: CreateBannerDto): Promise<AdminBanner> {
    return this.repository.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto): Promise<AdminBanner> {
    return this.repository.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
