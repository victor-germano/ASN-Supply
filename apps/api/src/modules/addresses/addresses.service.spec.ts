import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import type { AddressesRepository, AddressRecord } from './addresses.repository';

function fakeAddress(overrides: Partial<AddressRecord> = {}): AddressRecord {
  return {
    id: 'addr_1',
    userId: 'user_1',
    label: 'Casa',
    recipientName: 'Camila Rocha',
    street: 'Rua das Flores',
    number: '100',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    isDefault: false,
    createdAt: new Date(),
    ...overrides,
  } as AddressRecord;
}

describe('AddressesService', () => {
  it('lista só os endereços do usuário informado', async () => {
    const findManyByUserId = vi.fn().mockResolvedValue([fakeAddress()]);
    const service = new AddressesService({ findManyByUserId } as unknown as AddressesRepository);

    const result = await service.findAllForUser('user_1');

    expect(findManyByUserId).toHaveBeenCalledWith('user_1');
    expect(result).toHaveLength(1);
  });

  it('rejeita atualizar um endereço que não pertence ao usuário (IDOR)', async () => {
    const findOneForUser = vi.fn().mockResolvedValue(null);
    const service = new AddressesService({ findOneForUser } as unknown as AddressesRepository);

    await expect(service.update('outro-usuario', 'addr_1', { label: 'Trabalho' })).rejects.toThrow(
      NotFoundException,
    );
    expect(findOneForUser).toHaveBeenCalledWith('addr_1', 'outro-usuario');
  });

  it('rejeita remover um endereço que não pertence ao usuário (IDOR)', async () => {
    const findOneForUser = vi.fn().mockResolvedValue(null);
    const deleteMock = vi.fn();
    const service = new AddressesService({
      findOneForUser,
      delete: deleteMock,
    } as unknown as AddressesRepository);

    await expect(service.remove('outro-usuario', 'addr_1')).rejects.toThrow(NotFoundException);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('permite atualizar um endereço que pertence ao usuário', async () => {
    const owned = fakeAddress();
    const updated = fakeAddress({ label: 'Trabalho' });
    const update = vi.fn().mockResolvedValue(updated);
    const service = new AddressesService({
      findOneForUser: vi.fn().mockResolvedValue(owned),
      update,
    } as unknown as AddressesRepository);

    const result = await service.update('user_1', 'addr_1', { label: 'Trabalho' });

    expect(result.label).toBe('Trabalho');
    expect(update).toHaveBeenCalledWith('addr_1', 'user_1', { label: 'Trabalho' });
  });
});
