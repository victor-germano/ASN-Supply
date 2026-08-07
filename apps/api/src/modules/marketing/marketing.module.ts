import { Module } from '@nestjs/common';
import { SocialPostsController } from './social-posts/social-posts.controller';
import { SocialPostsRepository } from './social-posts/social-posts.repository';
import { NewsletterController } from './newsletter/newsletter.controller';
import { NewsletterService } from './newsletter/newsletter.service';
import { NewsletterRepository } from './newsletter/newsletter.repository';

@Module({
  controllers: [SocialPostsController, NewsletterController],
  providers: [SocialPostsRepository, NewsletterService, NewsletterRepository],
})
export class MarketingModule {}
