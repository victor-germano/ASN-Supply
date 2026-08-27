import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const RATINGS = [1, 2, 3, 4, 5];

export class CreateReviewDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsIn(RATINGS)
  rating!: 1 | 2 | 3 | 4 | 5;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10, { message: 'Conte um pouco mais — pelo menos 10 caracteres.' })
  @MaxLength(2000)
  comment!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoUrls?: string[];
}
