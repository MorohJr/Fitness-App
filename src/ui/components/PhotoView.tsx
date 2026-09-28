// הצגת תמונה מהמסד. מטושטשת עד שנוגעים (R-PHOTO-5) אם blur=true
import { useEffect, useState } from 'preact/hooks';
import { getPhoto } from '../../data/repos/photos';

export function PhotoView({ id, blur = false, alt = '' }: { id: string; blur?: boolean; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [hidden, setHidden] = useState(blur);
  useEffect(() => {
    let u: string | null = null;
    getPhoto(id).then((p) => {
      if (p) {
        u = URL.createObjectURL(p.blob);
        setUrl(u);
      }
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  if (!url) return <div class="photo ph" />;
  return (
    <button type="button" class="photo" onClick={() => setHidden(!hidden)} aria-label={hidden ? 'הצג תמונה' : 'הסתר תמונה'}>
      <img src={url} alt={alt} style={hidden ? { filter: 'blur(24px)' } : undefined} />
    </button>
  );
}
