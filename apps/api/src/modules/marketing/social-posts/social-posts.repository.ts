import { Injectable } from '@nestjs/common';
import type { SocialPost } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialPostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(limit: number): Promise<SocialPost[]> {
    const posts = await this.prisma.socialPost.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      take: limit,
    });

    return posts.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      permalink: post.permalink,
      caption: post.caption,
    }));
  }
}
