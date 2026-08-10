const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.82;

/**
 * Redimensiona a foto no navegador antes de enviar — uma foto de celular
 * moderna facilmente passa de 5-10MB, muito mais do que a análise
 * precisa. Fazer isso no client (não no servidor) evita transferir esses
 * megabytes à toa e mantém o payload da Server Action/endpoint bem abaixo
 * do limite configurado (ver next.config.mjs e main.ts).
 */
export async function resizeImageToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');

  // PNG (aceito explicitamente) pode ter transparência, mas o canvas nasce
  // transparente e JPEG não tem canal alfa — sem preencher um fundo antes,
  // toDataURL('image/jpeg') composita a transparência como preto sólido,
  // corrompendo silenciosamente qualquer foto com fundo recortado.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
