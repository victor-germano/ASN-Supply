import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../generated/client';

/**
 * Wrapper do PrismaClient como provider Nest — gerencia o ciclo de vida da
 * conexão com o Postgres junto ao ciclo de vida da aplicação (evita
 * conexões penduradas em hot-reload e em testes).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexão com o banco de dados estabelecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
