import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListBrandsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(48)
  limit: number = 12;
}
