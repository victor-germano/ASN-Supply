import { authenticatedFetch } from './authenticatedFetch';

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

/**
 * `file` chega como `File`/`Blob` vindo direto de um `<input type="file">`
 * (via Server Action) — empacotado em `FormData`, nunca em JSON (é assim
 * que `POST /admin/uploads`, atrás de `FileInterceptor`, espera receber
 * um arquivo). Ver `apiClient.ts` para o porquê de `Content-Type` nunca
 * ser setado manualmente num body `FormData`.
 */
export function uploadAdminImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);
  return authenticatedFetch<UploadedImage>('/admin/uploads', {
    init: { method: 'POST', body: formData },
  });
}
