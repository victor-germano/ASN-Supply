import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

/**
 * Todos os campos de `CreateAddressDto`, porém opcionais — via `PartialType`
 * em vez de redeclarar cada decorator campo a campo (regex de CEP,
 * `Length(2,2)` do estado etc.): uma mudança de regra de validação feita
 * só em `CreateAddressDto` já vale para edição também, sem risco das duas
 * cópias divergirem silenciosamente.
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
