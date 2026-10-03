import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Endereço do cadastro — mesmas regras de `CreateAddressDto`, sem rótulo/destinatário (vêm do próprio cadastro). */
export class SignupAddressDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'Informe um CEP válido (ex: 01310-100).' })
  zipCode!: string;

  @IsString()
  @MinLength(2, { message: 'Informe a rua.' })
  @MaxLength(160)
  street!: string;

  @IsString()
  @MinLength(1, { message: 'Informe o número.' })
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsString()
  @MinLength(2, { message: 'Informe o bairro.' })
  @MaxLength(120)
  neighborhood!: string;

  @IsString()
  @MinLength(2, { message: 'Informe a cidade.' })
  @MaxLength(120)
  city!: string;

  @IsString()
  @Length(2, 2, { message: 'Use a sigla do estado (ex: SP).' })
  state!: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Informe seu nome.' })
  @MaxLength(60)
  firstName!: string;

  @IsString()
  @MinLength(2, { message: 'Informe seu sobrenome.' })
  @MaxLength(80)
  lastName!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254)
  email!: string;

  /** Validado de verdade (celular BR, com DDD) em `AuthService.register` — aqui só formato básico. */
  @IsString()
  @MinLength(10, { message: 'Informe um celular válido com DDD.' })
  @MaxLength(20)
  phone!: string;

  // bcrypt trunca silenciosamente acima de 72 bytes — MaxLength(72) barra
  // isso antes, com uma mensagem clara, em vez de deixar a senha real do
  // usuário ser efetivamente mais curta do que ele digitou.
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(72, { message: 'A senha pode ter no máximo 72 caracteres.' })
  password!: string;

  @ValidateNested()
  @Type(() => SignupAddressDto)
  address!: SignupAddressDto;

  @Equals(true, { message: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.' })
  acceptTerms!: boolean;

  /** Opt-in de lembretes/ofertas por SMS — opcional e desmarcado por padrão (LGPD). */
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
