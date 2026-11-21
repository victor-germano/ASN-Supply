import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSocialPostDto {
  @IsString()
  @MaxLength(2000)
  imageUrl!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  permalink!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
