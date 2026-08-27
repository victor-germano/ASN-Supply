import { Injectable, NotFoundException } from '@nestjs/common';
import type { Address, CreateAddressInput, UpdateAddressInput } from '@asn/types';
import type { Address as AddressModel } from '../../../generated/client';
import { AddressesRepository } from './addresses.repository';

@Injectable()
export class AddressesService {
  constructor(private readonly repository: AddressesRepository) {}

  async findAllForUser(userId: string): Promise<Address[]> {
    const rows = await this.repository.findManyByUserId(userId);
    return rows.map(toAddress);
  }

  async create(userId: string, input: CreateAddressInput): Promise<Address> {
    const row = await this.repository.create({ userId, ...input });
    return toAddress(row);
  }

  async update(userId: string, id: string, input: UpdateAddressInput): Promise<Address> {
    await this.requireOwnership(id, userId);
    const row = await this.repository.update(id, userId, input);
    return toAddress(row);
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    await this.requireOwnership(id, userId);
    const row = await this.repository.update(id, userId, { isDefault: true });
    return toAddress(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireOwnership(id, userId);
    await this.repository.delete(id);
  }

  /** Toda operação de escrita passa por aqui antes — nunca confia num `id` sozinho (proteção IDOR). */
  private async requireOwnership(id: string, userId: string): Promise<AddressModel> {
    const address = await this.repository.findOneForUser(id, userId);
    if (!address) {
      throw new NotFoundException({
        errorCode: 'ADDRESS_NOT_FOUND',
        message: 'Endereço não encontrado.',
      });
    }
    return address;
  }
}

function toAddress(row: AddressModel): Address {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipientName,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}
