import { Module } from '@nestjs/common';
import { TryOnController } from './tryon.controller';
import { TryOnService } from './tryon.service';
import { TryOnAnalyzer } from './tryon-analyzer';
import { MockTryOnAnalyzer } from './mock-tryon-analyzer';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [TryOnController],
  providers: [TryOnService, { provide: TryOnAnalyzer, useClass: MockTryOnAnalyzer }],
})
export class TryOnModule {}
