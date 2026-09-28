// סריקת ברקוד במצלמה (ZXing, כי Safari לא תומך ב-BarcodeDetector). נטען רק כשצריך
import { useEffect, useRef, useState } from 'preact/hooks';

export function BarcodeScanner({ onResult, onClose }: { onResult: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let stop: (() => void) | null = null;
    let done = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (result) => {
          if (result && !done) {
            done = true;
            controls.stop();
            onResult(result.getText());
          }
        });
        stop = () => controls.stop();
      } catch (e) {
        setError((e as Error).name === 'NotAllowedError' ? 'אין הרשאה למצלמה. אפשר להקליד את הברקוד' : 'לא הצלחתי לפתוח מצלמה');
      }
    })();
    return () => stop?.();
  }, []);
  return (
    <div class="card">
      {error ? <div class="alert danger">{error}</div> : <video ref={video} class="scanner" muted playsInline />}
      <p class="small muted">כוון את הברקוד למרכז המסגרת</p>
      <button class="btn block" onClick={onClose}>סגור</button>
    </div>
  );
}
