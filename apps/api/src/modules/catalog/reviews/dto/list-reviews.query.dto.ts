import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListReviewsQueryDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 2, 3, 4, 5])
  rating?: 1 | 2 | 3 | 4 | 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize: number = 5;
}
