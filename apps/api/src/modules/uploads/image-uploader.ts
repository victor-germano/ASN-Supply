export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Porta (classe abstrata = token de injeção do Nest) — mesmo padrão de
 * `PaymentGateway`/`EmailSender`/`TryOnAnalyzer`: `CloudinaryImageUploader`
 * quando `CLOUDINARY_URL` existe, `DatabaseImageUploader` (imagem no banco
 * da própria loja) quando não — escolhidos em runtime por
 * `uploads.module.ts`. Os dois enviam de verdade: o painel nunca fica sem
 * upload por falta de conta em serviço externo.
 */
export abstract class ImageUploader {
  abstract upload(file: Buffer, filename: string): Promise<UploadedImage>;
}
