import { Injectable } from '@nestjs/common';
import { Prisma, type Address as AddressModel } from '../../../generated/client';
import { PrismaService } from '../prisma/prisma.service';

// READ COMMITTED (padrão do Postgres/Prisma) permite, em tese, duas
// requisições concorrentes de "definir como padrão" lerem o estado antes
// uma da outra e ambas commitarem um endereço como `isDefault: true` —
// Serializable fecha essa corrida (a segunda transação sobrepõe o
// intervalo de leitura/escrita da primeira e é forçada a re-executar).
const SET_DEFAULT_TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

export interface CreateAddressData {
  userId: string;
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
}

export type UpdateAddressData = Partial<Omit<CreateAddressData, 'userId'>>;

/**
 * Acesso cru ao model `Address`. Proteção contra IDOR (um usuário editando
 * o endereço de outro) é responsabilidade do `AddressesService`, que sempre
 * confirma posse via `findOneForUser` antes de chamar `update`/`delete` por
 * id puro — este repositório não repete essa checagem.
 */
@Injectable()
export class AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByUserId(userId: string): Promise<AddressModel[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findOneForUser(id: string, userId: string): Promise<AddressModel | null> {
    return this.prisma.address.findFirst({ where: { id, userId } });
  }

  async create(data: CreateAddressData): Promise<AddressModel> {
    const { userId, complement, isDefault, ...rest } = data;
    if (!isDefault) {
      return this.prisma.address.create({
        data: { ...rest, userId, complement: complement ?? null, isDefault: false },
      });
    }
    // Só um endereço padrão por usuário — zera os outros na mesma
    // transação que cria o novo já marcado como padrão.
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
        return tx.address.create({
          data: { ...rest, userId, complement: complement ?? null, isDefault: true },
        });
      }, SET_DEFAULT_TX_OPTIONS),
    );
  }

  async update(id: string, userId: string, data: UpdateAddressData): Promise<AddressModel> {
    if (!data.isDefault) {
      return this.prisma.address.update({ where: { id }, data });
    }
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({ where: { userId, NOT: { id } }, data: { isDefault: false } });
        return tx.address.update({ where: { id }, data });
      }, SET_DEFAULT_TX_OPTIONS),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.address.delete({ where: { id } });
  }

  /**
   * Serializable pode legitimamente abortar uma das duas transações
   * concorrentes com um erro de conflito de escrita (P2034) — é o
   * mecanismo funcionando como esperado, não uma falha real. Uma retentativa
   * já resolve quase sempre (mesmo espírito do retry de colisão de código
   * em `orders.repository.ts`, só que para conflito de serialização em vez
   * de unique constraint).
   */
  private async withSerializableRetry<T>(run: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await run();
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (isSerializationConflict && attempt < 3) {
        return this.withSerializableRetry(run, attempt + 1);
      }
      throw error;
    }
  }
}
