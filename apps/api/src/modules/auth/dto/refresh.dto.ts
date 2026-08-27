import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MinLength(1, { message: 'Token de renovação ausente.' })
  refreshToken!: string;
}
