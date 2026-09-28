import { describe, expect, it } from 'vitest';
import { parseHealthClipboard } from '../../src/domain/calc/health';

describe('הדבק מ-Health (נספח א׳)', () => {
  it('פורמט תקין', () => {
    expect(parseHealthClipboard('FITAPP;date=2026-09-28;steps=8432;sleep=7.2', '2026-09-28')).toEqual({ ok: true, steps: 8432, sleep: 7.2 });
  });
  it('בלי שינה (אין לוח זמני שינה)', () => {
    expect(parseHealthClipboard('FITAPP;date=2026-09-28;steps=500', '2026-09-28')).toEqual({ ok: true, steps: 500, sleep: null });
  });
  it('פסיק עשרוני ורווחים', () => {
    expect(parseHealthClipboard(' FITAPP;date=2026-09-28;steps=8432.0;sleep=6,5 ', '2026-09-28')).toEqual({ ok: true, steps: 8432, sleep: 6.5 });
  });
  it('תאריך לא של היום: לא נשמר כלום', () => {
    const r = parseHealthClipboard('FITAPP;date=2026-09-27;steps=8432', '2026-09-28');
    expect(r.ok).toBe(false);
  });
  it('פורמט שגוי', () => {
    expect(parseHealthClipboard('hello', '2026-09-28').ok).toBe(false);
    expect(parseHealthClipboard('FITAPP;date=2026-09-28;steps=abc', '2026-09-28').ok).toBe(false);
    expect(parseHealthClipboard('FITAPP;date=2026-09-28', '2026-09-28').ok).toBe(false);
    expect(parseHealthClipboard('FITAPP;date=2026-09-28;sleep=30', '2026-09-28').ok).toBe(false);
  });
});
