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
import type { AdminCollection } from '@asn/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminCollectionsRepository } from './admin-collections.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Controller({ path: 'admin/collections', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCollectionsController {
  constructor(private readonly repository: AdminCollectionsRepository) {}

  @Get()
  findAll(): Promise<AdminCollection[]> {
    return this.repository.findAll();
  }

  @Post()
  create(@Body() dto: CreateCollectionDto): Promise<AdminCollection> {
    return this.repository.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionDto): Promise<AdminCollection> {
    return this.repository.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
