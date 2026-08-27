import { Injectable } from '@nestjs/common';
import type { CartItem } from '@asn/types';
import { CartRepository } from './cart.repository';

@Injectable()
export class CartService {
  constructor(private readonly repository: CartRepository) {}

  findAllForUser(userId: string): Promise<CartItem[]> {
    return this.repository.findItemsForUser(userId);
  }

  setItemQuantity(userId: string, variantId: string, quantity: number): Promise<void> {
    return this.repository.setItemQuantity(userId, variantId, quantity);
  }

  removeItem(userId: string, variantId: string): Promise<void> {
    return this.repository.removeItem(userId, variantId);
  }

  clear(userId: string): Promise<void> {
    return this.repository.clear(userId);
  }
}
