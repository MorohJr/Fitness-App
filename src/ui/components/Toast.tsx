// הודעה תחתונה עם "בטל" למשך 5 שניות (3.7)
import { useEffect } from 'preact/hooks';
import { toastStore, useStore } from '../store';

export const TOAST_MS = 5000;

export function Toast() {
  const t = useStore(toastStore);
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => toastStore.get()?.id === t.id && toastStore.set(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [t?.id]);
  if (!t) return null;
  return (
    <div class="toast" role="status">
      <span class="grow">{t.message}</span>
      {t.undo && (
        <button
          onClick={async () => {
            toastStore.set(null);
            await t.undo!();
          }}
        >
          בטל
        </button>
      )}
    </div>
  );
}
