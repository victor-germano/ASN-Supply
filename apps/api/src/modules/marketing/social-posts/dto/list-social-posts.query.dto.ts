import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListSocialPostsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  limit: number = 6;
}
