import { IsInt, Max, Min } from 'class-validator';

/** Zero/negativo não passa por aqui — é o endpoint `DELETE /cart/items/:variantId`, não quantidade 0. */
export class SetCartItemQuantityDto {
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}
