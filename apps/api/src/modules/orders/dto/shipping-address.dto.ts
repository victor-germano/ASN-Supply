import { IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  neighborhood!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @IsString()
  @Length(2, 2, { message: 'Use a sigla do estado (ex: SP).' })
  state!: string;

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'Informe um CEP válido (ex: 01310-100).' })
  zipCode!: string;
}
