import { Injectable, NotFoundException } from '@nestjs/common';
import type { TryOnAnalysisResult } from '@asn/types';
import { ProductsRepository } from '../catalog/products/products.repository';
import { TryOnAnalyzer } from './tryon-analyzer';

@Injectable()
export class TryOnService {
  constructor(
    private readonly analyzer: TryOnAnalyzer,
    private readonly productsRepository: ProductsRepository,
  ) {}

  /** Produto é buscado no servidor (nunca confia em nome/marca vindos do client) para contextualizar a análise. */
  async analyze(photoBase64: string, productId: string): Promise<TryOnAnalysisResult> {
    const [product] = await this.productsRepository.findByIds([productId]);
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }

    return this.analyzer.analyze({
      photoBase64,
      product: {
        name: product.name,
        brandName: product.brand.name,
        categoryName: product.category.name,
      },
    });
  }
}
