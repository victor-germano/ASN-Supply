'use server';

import { ApiError } from '@/services/apiClient';
import { uploadAdminImage, type UploadedImage } from '@/services/uploads.service';

export type UploadImageActionResult =
  ({ success: true } & UploadedImage) | { success: false; message: string };

/**
 * `file` chega como `File` de verdade — Next.js serializa `File`/`Blob`
 * como argumento de Server Action nativamente (mesmo protocolo dos
 * `<form action={...}>` com input de arquivo), sem precisar de base64
 * manual nem de uma rota de API própria só pra isso.
 */
export async function uploadAdminImageAction(file: File): Promise<UploadImageActionResult> {
  try {
    const result = await uploadAdminImage(file);
    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível enviar a imagem agora. Cole uma URL diretamente.';
    return { success: false, message };
  }
}
