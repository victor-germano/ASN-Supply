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
import type { AdminSocialPost } from '@asn/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminSocialPostsRepository } from './admin-social-posts.repository';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import { UpdateSocialPostDto } from './dto/update-social-post.dto';

/** Mesmo mecanismo de `AdminBannersController`: `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')` direto no controller. */
@Controller({ path: 'admin/social-posts', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSocialPostsController {
  constructor(private readonly repository: AdminSocialPostsRepository) {}

  @Get()
  findAll(): Promise<AdminSocialPost[]> {
    return this.repository.findAll();
  }

  @Post()
  create(@Body() dto: CreateSocialPostDto): Promise<AdminSocialPost> {
    return this.repository.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSocialPostDto): Promise<AdminSocialPost> {
    return this.repository.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
