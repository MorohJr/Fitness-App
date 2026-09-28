// מסך ההגדרות הראשי (פרק 7)
import { getProfile, updateProfile } from '../../../data/repos/profile';
import type { ThemeMode } from '../../../domain/types';
import { useLive } from '../../hooks';
import { THEME_LABELS } from '../../labels';
import { NumberField, Segmented } from '../../components/Fields';
import { Icon, type IconName } from '../../components/Icon';
import { version } from '../../../../package.json';
import { SCHEMA_VERSION } from '../../../data/db';

const ITEMS: { to: string; icon: IconName; label: string }[] = [
  { to: '/settings/profile', icon: 'user', label: 'פרופיל' },
  { to: '/settings/equipment', icon: 'gear', label: 'ציוד ומיקומים' },
  { to: '/settings/targets', icon: 'target', label: 'יעדים ומחשבון קלוריות' },
  { to: '/settings/phases', icon: 'phases', label: 'שלבים' },
  { to: '/settings/week', icon: 'calendar', label: 'תוכנית שבועית ותבניות' },
  { to: '/workout/test', icon: 'workout', label: 'מבחן פתיחה' },
  { to: '/settings/health', icon: 'today', label: 'קיצור הדרך של Apple Health' },
  { to: '/settings/backup', icon: 'backup', label: 'גיבוי ושחזור' }
];

export function SettingsHome() {
  const profile = useLive(getProfile);
  return (
    <div>
      <h1>הגדרות</h1>
      <div class="list">
        {ITEMS.map((i) => (
          <a href={`#${i.to}`} key={i.to}>
            <Icon name={i.icon} />
            <span class="grow">{i.label}</span>
          </a>
        ))}
      </div>
      {profile && (
        <>
          <h2>תצוגה</h2>
          <Segmented<ThemeMode>
            value={profile.settings.themeMode}
            options={(Object.keys(THEME_LABELS) as ThemeMode[]).map((v) => ({ value: v, label: THEME_LABELS[v] }))}
            onChange={(themeMode) => updateProfile({ settings: { ...profile.settings, themeMode } })}
          />
        </>
      )}
      {profile && (
        <>
          <h2>אימון ותמונות</h2>
          <div class="card">
            <NumberField
              label="שבוע הורדת עומס כל"
              suffix="שבועות"
              min={4}
              max={6}
              value={profile.settings.deloadEveryWeeks}
              onChange={(v) => v && v >= 4 && v <= 6 && updateProfile({ settings: { ...profile.settings, deloadEveryWeeks: v } })}
              hint="4 עד 6 (R-DL-1)"
            />
            <NumberField
              label="מגבלת תמונות (מלבד סט הבסיס)"
              min={6}
              max={300}
              value={profile.settings.photoLimit}
              onChange={(v) => v && v >= 6 && updateProfile({ settings: { ...profile.settings, photoLimit: v } })}
              hint="כשנחצית, הסט הישן ביותר מוצע למחיקה (R-PHOTO-3)"
            />
          </div>
        </>
      )}
      <p class="small muted" style={{ marginTop: '16px' }}>גרסה {version} · מבנה נתונים {SCHEMA_VERSION}</p>
    </div>
  );
}
