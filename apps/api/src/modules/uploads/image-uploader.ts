export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Porta (classe abstrata = token de injeção do Nest) — mesmo padrão de
 * `PaymentGateway`/`EmailSender`/`TryOnAnalyzer`: um adapter real
 * (`CloudinaryImageUploader`) e um de fallback
 * (`UnavailableImageUploader`), escolhidos em runtime por
 * `uploads.module.ts` conforme `CLOUDINARY_URL` existir ou não. Diferente
 * dos outros fallbacks do projeto (que degradam graciosamente — loga em
 * vez de enviar, "indisponível" em vez de cobrar), aqui não existe um
 * resultado sensato sem upload de verdade: o fallback lança um erro claro
 * (ver `UnavailableImageUploader`), e o formulário do admin continua
 * aceitando URL colada à mão como sempre aceitou.
 */
export abstract class ImageUploader {
  abstract upload(file: Buffer, filename: string): Promise<UploadedImage>;
}
