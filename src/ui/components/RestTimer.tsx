// טיימר מנוחה: מחושב משעת ההתחלה, לא סופר (3.6). עובד גם אחרי נעילת מסך
import { useEffect, useState } from 'preact/hooks';

export function RestTimer({ startedAt, seconds }: { startedAt: number; seconds: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil(seconds - (now - startedAt) / 1000));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div>
      <div class="label">מנוחה</div>
      <div class={`timer${left === 0 ? ' done' : ''}`}>{left === 0 ? 'אפשר להתחיל' : `${mm}:${ss}`}</div>
    </div>
  );
}
