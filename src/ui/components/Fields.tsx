// שדות טופס משותפים. כל שדה בגובה 44 פיקסלים לפחות (3.7)
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Icon } from './Icon';

interface FieldProps {
  label: string;
  hint?: ComponentChildren;
  children: ComponentChildren;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label class="field">
      <span class="label">{label}</span>
      {children}
      {hint && <span class="hint">{hint}</span>}
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: ComponentChildren;
  decimal?: boolean;
}

export function NumberField({ label, value, onChange, step = 1, min, max, suffix, hint, decimal }: NumberFieldProps) {
  const [text, setText] = useState(value === null ? '' : String(value));
  // עדכון מבחוץ (למשל אישור מחשבון) בלי לדרוס הקלדה
  useEffect(() => {
    const parsed = text.trim() === '' ? null : Number(text);
    if (parsed !== value) setText(value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label} hint={hint}>
      <span class="input-wrap">
        <input
          class="input"
          type="number"
          inputMode={decimal ? 'decimal' : 'numeric'}
          step={step}
          min={min}
          max={max}
          value={text}
          onInput={(e) => {
            const t = (e.currentTarget as HTMLInputElement).value;
            setText(t);
            const n = t.trim() === '' ? null : Number(t);
            onChange(n === null || Number.isNaN(n) ? null : n);
          }}
        />
        {suffix && <span class="suffix">{suffix}</span>}
      </span>
    </Field>
  );
}

export function DateField(props: { label: string; value: string | null; onChange: (v: string | null) => void; min?: string; hint?: ComponentChildren }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <input
        class="input"
        type="date"
        min={props.min}
        value={props.value ?? ''}
        onInput={(e) => props.onChange((e.currentTarget as HTMLInputElement).value || null)}
      />
    </Field>
  );
}

export function SelectField<T extends string>(props: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  hint?: ComponentChildren;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <select class="input" value={props.value ?? ''} onChange={(e) => props.onChange((e.currentTarget as HTMLSelectElement).value as T)}>
        {props.value === null && <option value="">{props.placeholder ?? 'בחר'}</option>}
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Segmented<T extends string>(props: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div class="field">
      {props.label && <span class="label">{props.label}</span>}
      <div class="seg" role="group">
        {props.options.map((o) => (
          <button type="button" key={o.value} aria-pressed={o.value === props.value} onClick={() => props.onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BackLink({ to = '/settings', label = 'הגדרות' }: { to?: string; label?: string }) {
  return (
    <a class="back" href={`#${to}`}>
      <Icon name="back" /> {label}
    </a>
  );
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div class="alert danger" role="alert">
      {errors.map((e) => (
        <div key={e}>{e}</div>
      ))}
    </div>
  );
}
