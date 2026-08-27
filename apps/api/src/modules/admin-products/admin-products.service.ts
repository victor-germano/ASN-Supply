import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminProductDetail, AdminProductListItem, PaginatedResult } from '@asn/types';
import { AdminProductsRepository } from './admin-products.repository';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class AdminProductsService {
  constructor(private readonly repository: AdminProductsRepository) {}

  findAll(params: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PaginatedResult<AdminProductListItem>> {
    return this.repository.findAll(params);
  }

  async findById(id: string): Promise<AdminProductDetail> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }
    return product;
  }

  create(dto: CreateProductDto): Promise<AdminProductDetail> {
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateProductDto): Promise<AdminProductDetail> {
    await this.findById(id); // 404 cedo, antes de tentar o update
    return this.repository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }
}
