import { Controller, Get, Query } from '@nestjs/common';
import type { SocialPost } from '@asn/types';
import { SocialPostsRepository } from './social-posts.repository';
import { ListSocialPostsQueryDto } from './dto/list-social-posts.query.dto';

@Controller({ path: 'social-posts', version: '1' })
export class SocialPostsController {
  constructor(private readonly repository: SocialPostsRepository) {}

  @Get()
  findActive(@Query() query: ListSocialPostsQueryDto): Promise<SocialPost[]> {
    return this.repository.findActive(query.limit);
  }
}
