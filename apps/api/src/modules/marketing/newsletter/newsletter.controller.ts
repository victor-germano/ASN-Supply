import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { NewsletterSubscribeResult } from '@asn/types';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Controller({ path: 'newsletter', version: '1' })
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  // Endpoint público de escrita: limite bem mais restrito que o padrão
  // global, para dificultar abuso (inscrição em massa/spam).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Body() dto: SubscribeNewsletterDto): Promise<NewsletterSubscribeResult> {
    return this.service.subscribe(dto.email);
  }
}
