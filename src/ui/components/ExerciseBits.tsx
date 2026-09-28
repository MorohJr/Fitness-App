// רכיבים קטנים לתרגילים
import type { ComponentChildren } from 'preact';
import type { Exercise } from '../../domain/types';
import { FAMILY_META, type FamilyId } from '../../domain/families';
import { STATUS_EMOJI } from '../labels';

export function StatusDot({ ex }: { ex: Pick<Exercise, 'status'> }) {
  return <span aria-label={ex.status ?? 'ללא סטטוס'}>{ex.status ? STATUS_EMOJI[ex.status] : '•'}</span>;
}

export function familyText(ex: Exercise): string {
  return ex.families.map((f) => `${FAMILY_META[f.family as FamilyId]?.name ?? f.family} · ${f.level}`).join(' | ');
}

export function ExerciseCard({ ex, blocked, off, extra }: { ex: Exercise; blocked?: boolean; off?: boolean; extra?: ComponentChildren }) {
  return (
    <a class={`ex-card${off ? ' off' : ''}`} href={`#/workout/exercise/${ex.id}`}>
      <div class="row">
        <span class="name">
          {ex.name}
        </span>
        <span>
          {blocked && <span class="tag block">⛔ חסום</span>}
          {ex.custom && <span class="tag mine">שלי</span>}
        </span>
      </div>
      <div class="meta">
        {familyText(ex)}
        {extra}
      </div>
    </a>
  );
}

/** בחירה מרובה בכפתורים */
export function ChipsSelect<T extends string>(props: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <div class="chips-sel">
      {props.options.map((o) => {
        const on = props.value.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            aria-pressed={on}
            onClick={() => props.onChange(on ? props.value.filter((x) => x !== o.value) : [...props.value, o.value])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
