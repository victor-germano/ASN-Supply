import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListCollectionsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  limit: number = 4;
}
