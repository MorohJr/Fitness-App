// שמירת קובץ: תפריט השיתוף באייפון (AirDrop / iCloud Drive), ואחרת הורדה רגילה
export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export async function shareOrDownload(bytes: Uint8Array, fileName: string, type = 'application/zip'): Promise<ShareResult> {
  const blob = new Blob([bytes as BlobPart], { type });
  const file = new File([blob], fileName, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // אם השיתוף נכשל, ממשיכים להורדה
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
