import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TryOnAnalysisResult, TryOnConfig } from '@asn/types';
import { ProductsRepository } from '../catalog/products/products.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TryOnAnalyzer } from './tryon-analyzer';
import { recommendSizeByFootLength } from './size-chart';

export interface TryOnRequest {
  productId: string;
  photoBase64?: string;
  footLengthCm?: number;
}

@Injectable()
export class TryOnService {
  constructor(
    private readonly analyzer: TryOnAnalyzer,
    private readonly productsRepository: ProductsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /** O site monta a tela a partir disto: pede foto só quando há quem a analise. */
  config(): TryOnConfig {
    return { usesPhoto: this.analyzer.usesPhoto };
  }

  /** Produto é buscado no servidor (nunca confia em nome/marca vindos do client) para contextualizar a análise. */
  async analyze(request: TryOnRequest): Promise<TryOnAnalysisResult> {
    if (this.analyzer.usesPhoto && !request.photoBase64) {
      throw new BadRequestException({
        errorCode: 'PHOTO_REQUIRED',
        message: 'Envie uma foto para a análise.',
      });
    }
    const [product] = await this.productsRepository.findByIds([request.productId]);
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }

    const result = await this.analyzer.analyze({
      // Foto só segue adiante para o adapter que a usa — sem IA, nem sai daqui.
      photoBase64: this.analyzer.usesPhoto ? (request.photoBase64 ?? null) : null,
      product: {
        id: product.id,
        name: product.name,
        brandName: product.brand.name,
        categoryName: product.category.name,
      },
    });
    if (request.footLengthCm === undefined) return result;

    // Medida informada vale mais que qualquer palpite por foto: o tamanho
    // sai da tabela de medidas, igual nos dois adapters.
    const inStock = await this.prisma.productVariant.findMany({
      where: { productId: product.id, stockQuantity: { gt: 0 } },
      select: { size: true },
      distinct: ['size'],
    });
    return {
      ...result,
      fitRecommendation: recommendSizeByFootLength(
        request.footLengthCm,
        inStock.map((variant) => variant.size),
      ),
    };
  }
}
