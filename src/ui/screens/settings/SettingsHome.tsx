// מסך ההגדרות הראשי (פרק 7)
import { getProfile, updateProfile } from '../../../data/repos/profile';
import type { ThemeMode } from '../../../domain/types';
import { useLive } from '../../hooks';
import { THEME_LABELS } from '../../labels';
import { Segmented } from '../../components/Fields';
import { Icon, type IconName } from '../../components/Icon';

const ITEMS: { to: string; icon: IconName; label: string }[] = [
  { to: '/settings/profile', icon: 'user', label: 'פרופיל' },
  { to: '/settings/equipment', icon: 'gear', label: 'ציוד ומיקומים' },
  { to: '/settings/targets', icon: 'target', label: 'יעדים ומחשבון קלוריות' },
  { to: '/settings/phases', icon: 'phases', label: 'שלבים' },
  { to: '/settings/week', icon: 'calendar', label: 'תוכנית שבועית ותבניות' },
  { to: '/workout/test', icon: 'workout', label: 'מבחן פתיחה' },
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
      <p class="muted small">הורדת עומס, מגבלת תמונות והוראות Apple Health יתווספו בשלבים הבאים.</p>
    </div>
  );
}
