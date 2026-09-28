import { describe, expect, it } from 'vitest';
import { freshApp, setNow } from './helpers';
import { getDb } from '../../src/data/db';
import { purgeDeleted } from '../../src/data/purge';
import { deleteSupplement, saveSupplement } from '../../src/data/repos/supplements';

describe('ניקוי סופי אחרי 90 יום (3.3)', () => {
  it('מוחק רק מחוקים ישנים', async () => {
    await freshApp('2026-01-01');
    const a = await saveSupplement({ name: 'A', dose: '', timing: 'morning', active: true });
    const b = await saveSupplement({ name: 'B', dose: '', timing: 'morning', active: true });
    await deleteSupplement(a.id);
    setNow('2026-03-15');
    await deleteSupplement(b.id);
    setNow('2026-04-05'); // 94 יום אחרי המחיקה של A, 21 אחרי B
    expect(await purgeDeleted(true)).toBe(1);
    const ids = (await getDb().data('supplements').toArray()).map((r) => r.id);
    expect(ids).toEqual([b.id]);
  });
});
