import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FirestoreService } from '../firestore/firestore.service';

interface HealthReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    firestore: 'up' | 'down';
  };
}

/**
 * Endpoint de health check consultado por load balancer / orquestrador.
 * Verifica conectividade real com o banco (não apenas "o processo respondeu").
 *
 * Firestore, não Postgres — desde a Fase 5 da migração (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md), Postgres só
 * segue vivo pelo fallback `StoredImage` (sem Cloudinary configurada) —
 * dormente em produção, não é mais a dependência que importa verificar aqui.
 * `listCollections()` é o equivalente Firestore de um `SELECT 1`: confirma
 * conectividade de verdade sem depender da existência de nenhum dado de
 * negócio específico.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly firestore: FirestoreService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const firestoreIsUp = await this.pingFirestore();

    const report: HealthReport = {
      status: firestoreIsUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        firestore: firestoreIsUp ? 'up' : 'down',
      },
    };

    res.status(firestoreIsUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(report);
  }

  private async pingFirestore(): Promise<boolean> {
    try {
      await this.firestore.db.listCollections();
      return true;
    } catch {
      return false;
    }
  }
}
