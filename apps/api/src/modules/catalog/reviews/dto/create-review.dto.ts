import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const RATINGS = [1, 2, 3, 4, 5];
const OWN_MEDIA_URL = /^https:\/\/res\.cloudinary\.com\//;

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

  // Campo enviado pelo CLIENTE e exibido a todos na página do produto: só
  // aceita arquivo hospedado na nossa Cloudinary. Uma URL qualquer
  // permitiria rastrear quem abre a página (pixel) e, num host fora de
  // `images.remotePatterns`, derrubaria a página do produto inteira.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(OWN_MEDIA_URL, { each: true, message: 'Envie a foto pelo próprio site.' })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(OWN_MEDIA_URL, { each: true, message: 'Envie o vídeo pelo próprio site.' })
  videoUrls?: string[];
}
