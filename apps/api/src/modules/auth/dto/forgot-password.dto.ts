import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import type { PasswordResetChannel } from '@asn/types';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254)
  email!: string;

  /** `email` = link de redefinição; `sms` = código de 6 dígitos no celular cadastrado. */
  @IsOptional()
  @IsIn(['email', 'sms'])
  channel?: PasswordResetChannel;
}
