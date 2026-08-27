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
import type { Brand } from '@asn/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminBrandsRepository } from './admin-brands.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

/** Mesmo mecanismo de `AdminProductsController`: `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')` direto no controller. */
@Controller({ path: 'admin/brands', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBrandsController {
  constructor(private readonly repository: AdminBrandsRepository) {}

  @Get()
  findAll(): Promise<Brand[]> {
    return this.repository.findAll();
  }

  @Post()
  create(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.repository.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
    return this.repository.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
