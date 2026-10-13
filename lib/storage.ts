// Fotos de las cadenas: Vercel Blob en producción, public/uploads/ en desarrollo local.
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024;

export function isAllowedPhoto(file: File): boolean {
  return file.type in EXT && file.size <= MAX_PHOTO_BYTES;
}

export async function savePhoto(file: File): Promise<string> {
  const name = `${randomUUID()}.${EXT[file.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`cadenas/${name}`, file, { access: 'public', contentType: file.type });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error('Falta BLOB_READ_WRITE_TOKEN: activá Vercel Blob desde el panel de Vercel (Storage).');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deletePhoto(url: string) {
  try {
    if (url.startsWith('/uploads/')) {
      await unlink(path.join(process.cwd(), 'public', 'uploads', path.basename(url)));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import('@vercel/blob');
      await del(url);
    }
  } catch {
    // una foto huérfana no debe impedir borrar la cadena
  }
}
