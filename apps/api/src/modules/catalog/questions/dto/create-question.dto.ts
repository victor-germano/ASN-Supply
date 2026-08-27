import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  productId!: string;

  @IsString()
  @MinLength(5, { message: 'Escreva a pergunta com um pouco mais de detalhe.' })
  @MaxLength(500)
  question!: string;
}
