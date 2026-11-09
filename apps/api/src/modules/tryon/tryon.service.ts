import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TryOnAnalysisResult, TryOnConfig } from '@asn/types';
import { ProductsRepository } from '../catalog/products/products.repository';
import { FirestoreService } from '../firestore/firestore.service';
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
    private readonly firestore: FirestoreService,
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
    // sai da tabela de medidas, igual nos dois adapters. `product.id` é o
    // slug (ver `ProductsRepository`) — Product/ProductVariant migraram
    // pro Firestore na Fase 3 da migração.
    const variantsSnapshot = await this.firestore.db
      .collection('products')
      .doc(product.id)
      .collection('variants')
      .get();
    const sizesInStock = new Set(
      variantsSnapshot.docs
        .map((doc) => doc.data() as { size: string; stockQuantity: number })
        .filter((variant) => variant.stockQuantity > 0)
        .map((variant) => variant.size),
    );
    return {
      ...result,
      fitRecommendation: recommendSizeByFootLength(request.footLengthCm, Array.from(sizesInStock)),
    };
  }
}
