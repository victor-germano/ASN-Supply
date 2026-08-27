import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

/** Todos os campos de `CreateProductDto`, porém opcionais — PATCH parcial. */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
