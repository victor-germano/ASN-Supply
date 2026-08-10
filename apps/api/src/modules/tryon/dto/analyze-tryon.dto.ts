import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AnalyzeTryOnDto {
  // Data URL — nunca aceita base64 "cru" sem prefixo, para garantir que o
  // que chega é declaradamente uma imagem (JPEG/PNG/WebP) antes de
  // qualquer processamento, mesmo hoje sem persistir nada.
  @IsString()
  @Matches(/^data:image\/(jpeg|png|webp);base64,/, {
    message: 'Envie uma imagem em JPEG, PNG ou WebP.',
  })
  @MinLength(100, { message: 'Foto inválida ou vazia.' })
  // ~4,5MB decodificados (base64 é ~1.37x o tamanho original) — hoje isto
  // nunca é de fato alcançado: o body parser do Express (main.ts) e o
  // limite de Server Action do Next (next.config.mjs) já cortam em 4mb
  // antes da requisição chegar aqui. Mantido mesmo assim como defesa em
  // profundidade — se um desses dois limites mudar (ou este endpoint for
  // chamado por outro client sem esses limites) sem que alguém lembre de
  // atualizar este validador junto, ele continua sendo o último a barrar
  // um payload absurdo, ainda que com uma mensagem genérica nesse caso.
  @MaxLength(6_000_000, { message: 'Foto muito grande — envie uma imagem menor.' })
  photoBase64!: string;

  @IsString()
  @MinLength(1)
  productId!: string;
}
