import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { ShippingMethod } from '@asn/types';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ShippingAddressDto } from './shipping-address.dto';

const SHIPPING_METHODS: ShippingMethod[] = ['STANDARD', 'EXPRESS'];

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'O carrinho está vazio.' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  // guestName/guestEmail/guestPhone continuam obrigatórios sempre, convidado
  // ou autenticado (decisão deliberada — ver comentário em
  // orders.repository.ts): mantém este DTO puramente aditivo e evita
  // qualquer mudança de shape no adapter de pagamento (Fase 4).
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  guestName!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254)
  guestEmail!: string;

  @IsString()
  @Matches(/^\+?\d{10,15}$/, { message: 'Informe um telefone válido, com DDD.' })
  guestPhone!: string;

  // Um dos dois, nunca os dois: endereço salvo (cliente autenticado) OU
  // endereço digitado na hora (convidado ou autenticado sem endereço
  // salvo). `addressId` só é aceito com login — o controller injeta
  // `userId` a partir do JWT, nunca do body.
  @IsOptional()
  @IsString()
  addressId?: string;

  @ValidateIf((dto: CreateOrderDto) => !dto.addressId)
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @IsIn(SHIPPING_METHODS)
  shippingMethod!: ShippingMethod;

  // Revalidado do zero dentro da transação de `OrdersRepository.create`
  // (regras de `validateCoupon`) — nunca confia no desconto calculado no
  // navegador a partir do preview de `POST /coupons/validate`.
  @IsOptional()
  @IsString()
  couponCode?: string;
}
