import { Controller, Get } from '@nestjs/common';
import type { Banner } from '@asn/types';
import { BannersRepository } from './banners.repository';

@Controller({ path: 'banners', version: '1' })
export class BannersController {
  constructor(private readonly repository: BannersRepository) {}

  @Get()
  findActive(): Promise<Banner[]> {
    return this.repository.findActive();
  }
}
