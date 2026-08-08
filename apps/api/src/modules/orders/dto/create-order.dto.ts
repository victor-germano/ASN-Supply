import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
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

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsIn(SHIPPING_METHODS)
  shippingMethod!: ShippingMethod;
}
