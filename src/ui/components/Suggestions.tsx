// הצעות ממתינות עם אישור או דחייה בלחיצה (E2)
import { useState } from 'preact/hooks';
import type { Suggestion } from '../../domain/types';
import { listPendingSuggestions } from '../../data/repos/suggestions';
import { approveSuggestion, rejectSuggestion } from '../../data/suggestionActions';
import { useLive } from '../hooks';
import { showToast } from '../store';

function Item({ s }: { s: Suggestion }) {
  const [load, setLoad] = useState('10 ק"ג');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(msg);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const labels: Partial<Record<Suggestion['type'], [string, string]>> = {
    missedWorkout: ['בצע היום', 'דלג'],
    recoverySwap: ['החלף להתאוששות', 'בכל זאת להתאמן']
  };
  const [yes, no] = labels[s.type] ?? ['אשר', 'דחה'];
  return (
    <div class="card sugg">
      <strong>{s.title}</strong>
      <p class="small muted" style={{ margin: '6px 0 10px' }}>{s.reason}</p>
      {s.type === 'load' && (
        <label class="field">
          <span class="label">העומס להוסיף</span>
          <input class="input" value={load} onInput={(e) => setLoad((e.currentTarget as HTMLInputElement).value)} />
        </label>
      )}
      {err && <div class="alert danger">{err}</div>}
      {s.type === 'stayOrEasier' ? (
        <div class="actions">
          <button class="btn" disabled={busy} onClick={() => run(() => approveSuggestion(s.id, 'stay'), 'נשארים, מהקצה התחתון')}>להישאר</button>
          {s.payload.previousId ? <button class="btn" disabled={busy} onClick={() => run(() => approveSuggestion(s.id, 'easier'), 'חוזרים לרמה הקלה')}>לחזור לרמה קלה</button> : null}
          <button class="btn" disabled={busy} onClick={() => run(() => rejectSuggestion(s.id), 'נדחה')}>התעלם</button>
        </div>
      ) : (
        <div class="actions">
          <button class="btn" disabled={busy} onClick={() => run(() => rejectSuggestion(s.id), 'נרשם')}>{no}</button>
          <button class="btn primary" disabled={busy} onClick={() => run(() => approveSuggestion(s.id, s.type === 'load' ? load : null), 'אושר')}>{yes}</button>
        </div>
      )}
    </div>
  );
}

export function SuggestionsList({ filter, empty }: { filter?: (s: Suggestion) => boolean; empty?: string }) {
  const list = useLive(listPendingSuggestions);
  if (!list) return null;
  const shown = filter ? list.filter(filter) : list;
  if (!shown.length) return empty ? <p class="small muted">{empty}</p> : null;
  return (
    <div>
      {shown.map((s) => <Item key={s.id} s={s} />)}
    </div>
  );
}
