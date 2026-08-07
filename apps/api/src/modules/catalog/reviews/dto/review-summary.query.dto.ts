import { IsString } from 'class-validator';

export class ReviewSummaryQueryDto {
  @IsString()
  productId!: string;
}
