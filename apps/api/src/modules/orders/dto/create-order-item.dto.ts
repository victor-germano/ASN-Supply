import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}
