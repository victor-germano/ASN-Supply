import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254)
  email!: string;

  // bcrypt trunca silenciosamente acima de 72 bytes — MaxLength(72) barra
  // isso antes, com uma mensagem clara, em vez de deixar a senha real do
  // usuário ser efetivamente mais curta do que ele digitou.
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(72, { message: 'A senha pode ter no máximo 72 caracteres.' })
  password!: string;
}
