import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  // Precisam vir os dois juntos pra aparecer no catálogo público
  // (`CategoriesRepository.findTopLevel` só monta `image` quando
  // `imageUrl && imageAlt`) — o form do admin garante isso na UI, não
  // validado aqui pra deixar salvar um rascunho com só um dos dois.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAlt?: string;
}
