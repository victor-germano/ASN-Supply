import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/client';

/**
 * P2025 (registro não encontrado, ex: id apagado entre a listagem e o
 * clique) e P2003 (violação de FK — produtos, ou uma subcategoria, ainda
 * referenciam esta linha) viram mensagens que fazem sentido pro admin, em
 * vez do erro cru do Prisma estourando como 500. Compartilhado pelos três
 * repositórios do módulo (marca/categoria/coleção) — mesma dupla de erros
 * possíveis em qualquer `update`/`delete` deles.
 */
export function toFriendlyError(error: unknown, label: string): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: `${label} não encontrada.`,
      });
    }
    if (error.code === 'P2003') {
      return new ConflictException({
        errorCode: 'IN_USE',
        message: `Não é possível excluir: ainda há produtos (ou subcategorias) usando esta ${label.toLowerCase()}.`,
      });
    }
  }
  return error as Error;
}
