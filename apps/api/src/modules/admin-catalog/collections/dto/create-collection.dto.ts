import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverImageAlt?: string;

  // `null` explícito = "ainda não lançada" (some de "Lançamentos" e de
  // `/colecoes/[slug]`, ver `CollectionsRepository.findBySlug`); omitido =
  // não mexe no valor atual (só relevante no PATCH, ver `UpdateCollectionDto`).
  @IsOptional()
  @IsISO8601()
  launchedAt?: string | null;
}
