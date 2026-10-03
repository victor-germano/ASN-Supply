import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class TrackActivityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  productId!: string;

  @IsIn(['PRODUCT_VIEW', 'CART_ADD'])
  type!: 'PRODUCT_VIEW' | 'CART_ADD';
}
