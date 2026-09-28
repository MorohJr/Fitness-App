// תמונות התקדמות: השוואה בין תאריכים, מטושטשות עד נגיעה, ניקוי לפי מגבלה (R-PHOTO)
import { useState } from 'preact/hooks';
import type { ProgressPhotoSet } from '../../../domain/types';
import { createPhotoSet, deletePhotoSet, listPhotoSets, photosBySet } from '../../../data/repos/body';
import { getProfile } from '../../../data/repos/profile';
import { clock } from '../../../data/clock';
import { photoCleanupCandidate } from '../../../domain/rules/R-BODY';
import { formatDate } from '../../../domain/calc/dates';
import type { PhotoRow } from '../../../data/repos/photos';
import { useLive } from '../../hooks';
import { PhotoView } from '../../components/PhotoView';
import { ErrorList } from '../../components/Fields';
import { resizeImage } from '../../image';
import { showToast } from '../../store';
import { BodyTabs } from './BodyTabs';

const VIEW_LABELS: Record<string, string> = { front: 'חזית', back: 'גב', side: 'צד' };

/** R-PHOTO-4: שמירה לאפליקציית התמונות (תפריט השיתוף) לפני מחיקה */
async function saveToPhotos(photos: PhotoRow[]): Promise<boolean> {
  const files = photos.map((p) => new File([p.blob], `${p.date ?? 'photo'}-${p.view}.jpg`, { type: 'image/jpeg' }));
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return true;
    } catch {
      return false;
    }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
  }
  return true;
}

export function PhotosScreen() {
  const data = useLive(async () => ({ sets: await listPhotoSets(), by: await photosBySet(), profile: await getProfile() }));
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  if (!data) return null;
  const { sets, by, profile } = data;
  const counts = new Map(sets.map((s) => [s.id, (by.get(s.id) ?? []).length]));
  const cand = photoCleanupCandidate(sets, counts, profile?.settings.photoLimit ?? 40);
  const left = sets.find((s) => s.id === a) ?? sets[0];
  const right = sets.find((s) => s.id === b) ?? sets[sets.length - 1];
  const photo = (s: ProgressPhotoSet | undefined, v: string) => (s ? (by.get(s.id) ?? []).find((p) => p.view === v) : undefined);

  async function addSet(e: Event) {
    const list = Array.from((e.currentTarget as HTMLInputElement).files ?? []).slice(0, 3);
    if (!list.length) return;
    try {
      const views = ['front', 'back', 'side'] as const;
      const blobs: Partial<Record<'front' | 'back' | 'side', Blob>> = {};
      for (let i = 0; i < list.length; i++) blobs[views[i]] = await resizeImage(list[i]);
      await createPhotoSet(clock.today(), null, blobs);
      showToast('התמונות נשמרו');
    } catch (err) {
      setErrors([(err as Error).message]);
    }
  }

  return (
    <div>
      <h1>גוף ושיאים</h1>
      <BodyTabs active="/body/photos" />
      {cand && (
        <div class="card sugg">
          <strong>חצית את מגבלת התמונות</strong>
          <p class="small muted">הסט מ-{formatDate(cand.date)} הוא הישן ביותר (חוץ מסט הבסיס), ומוצע למחיקה (R-PHOTO-3). קודם שמור אותו לאפליקציית התמונות.</p>
          <div class="actions">
            <button class="btn" onClick={async () => (await saveToPhotos(by.get(cand.id) ?? [])) && setSaved(cand.id)}>שמור לאפליקציית התמונות</button>
            <button class="btn danger" disabled={saved !== cand.id} onClick={async () => { await deletePhotoSet(cand.id); showToast('הסט נמחק'); }}>מחק</button>
          </div>
        </div>
      )}
      <ErrorList errors={errors} />
      {sets.length === 0 ? (
        <p class="muted">אין תמונות. אפשר לצלם במדידה חדשה, או להוסיף כאן.</p>
      ) : (
        <div class="card">
          <h2>השוואה</h2>
          <div class="grid2">
            <select class="input" value={left?.id} onChange={(e) => setA((e.currentTarget as HTMLSelectElement).value)} aria-label="תאריך ראשון">
              {sets.map((s) => <option key={s.id} value={s.id}>{formatDate(s.date)}{s.isBaseline ? ' (בסיס)' : ''}</option>)}
            </select>
            <select class="input" value={right?.id} onChange={(e) => setB((e.currentTarget as HTMLSelectElement).value)} aria-label="תאריך שני">
              {sets.map((s) => <option key={s.id} value={s.id}>{formatDate(s.date)}{s.isBaseline ? ' (בסיס)' : ''}</option>)}
            </select>
          </div>
          {(['front', 'back', 'side'] as const).map((v) => (
            <div key={v} style={{ marginTop: '10px' }}>
              <div class="label" style={{ marginBottom: '6px' }}>{VIEW_LABELS[v]}</div>
              <div class="grid2">
                {[left, right].map((s, i) => {
                  const p = photo(s, v);
                  return p ? <PhotoView key={p.id + i} id={p.id} blur /> : <div key={i} class="photo ph" />;
                })}
              </div>
            </div>
          ))}
          <p class="small muted" style={{ marginTop: '8px' }}>התמונות מטושטשות עד שנוגעים בהן (R-PHOTO-5).</p>
        </div>
      )}
      <label class="btn block">
        + סט תמונות (חזית, גב, צד)
        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addSet} />
      </label>
      {sets.length > 0 && (
        <>
          <h2>כל הסטים</h2>
          <div class="list">
            {[...sets].reverse().map((s) => (
              <div class="item" key={s.id}>
                <span class="grow">{formatDate(s.date)} · {(by.get(s.id) ?? []).length} תמונות{s.isBaseline ? ' · בסיס' : ''}</span>
                {!s.isBaseline && (
                  <button class="btn danger" onClick={async () => { if ((await saveToPhotos(by.get(s.id) ?? []))) { await deletePhotoSet(s.id); showToast('הסט נמחק (אחרי שמירה)'); } }}>
                    שמור ומחק
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
