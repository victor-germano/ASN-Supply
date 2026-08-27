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
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AdminProductDetail, AdminProductListItem, PaginatedResult } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListAdminProductsQueryDto } from './dto/list-admin-products.query.dto';

/**
 * O mecanismo que `admin/admin-auth.guard.ts` (superado, ver comentário lá)
 * previa desde o Módulo 0: `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`
 * direto no controller, agora que a Área do Cliente (Módulo 5) existe.
 * `/admin/products` no path (não só a UI oculta em `/admin`) — mesmo que
 * alguém descubra a URL da API diretamente, sem token de ADMIN não entra.
 */
@Controller({ path: 'admin/products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminProductsController {
  constructor(private readonly service: AdminProductsService) {}

  @Get()
  findAll(
    @Query() query: ListAdminProductsQueryDto,
  ): Promise<PaginatedResult<AdminProductListItem>> {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<AdminProductDetail> {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<AdminProductDetail> {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<AdminProductDetail> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
