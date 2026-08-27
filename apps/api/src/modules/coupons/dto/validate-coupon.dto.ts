import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsInt()
  @Min(0)
  subtotalInCents!: number;
}
