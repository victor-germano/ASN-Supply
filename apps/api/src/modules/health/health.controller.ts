import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface HealthReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: 'up' | 'down';
  };
}

/**
 * Endpoint de health check consultado por load balancer / orquestrador.
 * Verifica conectividade real com o banco (não apenas "o processo respondeu").
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const databaseIsUp = await this.pingDatabase();

    const report: HealthReport = {
      status: databaseIsUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseIsUp ? 'up' : 'down',
      },
    };

    res.status(databaseIsUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(report);
  }

  private async pingDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
