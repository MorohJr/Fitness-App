// הקטנת תמונה: צד ארוך 1280 פיקסלים, JPEG באיכות 80% (R-PHOTO-1)
export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.8;

export function fitSize(w: number, h: number, max = MAX_SIDE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

export async function resizeImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const { w, h } = fitSize(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('שמירת התמונה נכשלה'))), 'image/jpeg', JPEG_QUALITY));
}
