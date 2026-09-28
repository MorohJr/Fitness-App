// יכולות מכשיר בזמן אימון: מסך דלוק (Wake Lock) וצליל סיום מנוחה (3.6)
let ctx: AudioContext | null = null;

/** להפעיל בלחיצה של המשתמש, כדי שהאייפון ירשה צליל אחר כך */
export function unlockAudio(): void {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function beep(): void {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {
    /* אין צליל */
  }
}

type Sentinel = { release: () => Promise<void> };
let lock: Sentinel | null = null;

export async function keepAwake(on: boolean): Promise<void> {
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
  try {
    if (on && nav.wakeLock && !lock) lock = await nav.wakeLock.request('screen');
    if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    lock = null;
  }
}

/** אחרי חזרה לאפליקציה Wake Lock משתחרר, מבקשים שוב */
export function rearmOnVisible(): () => void {
  const h = () => {
    if (document.visibilityState === 'visible') {
      lock = null;
      keepAwake(true);
    }
  };
  document.addEventListener('visibilitychange', h);
  return () => document.removeEventListener('visibilitychange', h);
}
