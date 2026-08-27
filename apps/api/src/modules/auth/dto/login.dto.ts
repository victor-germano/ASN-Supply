import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Informe sua senha.' })
  @MaxLength(72)
  password!: string;
}
