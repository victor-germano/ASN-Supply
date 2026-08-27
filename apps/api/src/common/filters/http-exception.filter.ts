import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '@asn/types';

/**
 * Normaliza toda exceção (HttpException ou erro não tratado) para o
 * contrato ApiErrorBody consumido pelo frontend — o client nunca precisa
 * lidar com formatos de erro divergentes entre endpoints.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ApiErrorBody = {
      statusCode,
      errorCode: this.resolveErrorCode(exception, statusCode),
      message: this.resolveMessage(exception),
      details: this.resolveDetails(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      // Só 500+ (erro nosso, não erro de validação/negócio do cliente) —
      // um 404/400 esperado não deveria virar ruído no Sentry. No-op sem
      // `SENTRY_DSN` configurada (ver `instrument.ts`).
      Sentry.captureException(exception);
    }

    response.status(statusCode).json(body);
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const message = (response as { message: unknown }).message;
        return Array.isArray(message) ? message.join('; ') : String(message);
      }
      return exception.message;
    }
    return 'Erro interno inesperado. Nossa equipe já foi notificada.';
  }

  private resolveErrorCode(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && 'errorCode' in response) {
        return String((response as { errorCode: unknown }).errorCode);
      }
    }
    return HttpStatus[statusCode] ?? 'INTERNAL_ERROR';
  }

  private resolveDetails(exception: unknown): Record<string, string[]> | undefined {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && 'details' in response) {
        return (response as { details: Record<string, string[]> }).details;
      }
    }
    return undefined;
  }
}
