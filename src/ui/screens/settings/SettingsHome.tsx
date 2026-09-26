// מסך ההגדרות הראשי (פרק 7)
import { getProfile, updateProfile } from '../../../data/repos/profile';
import type { ThemeMode } from '../../../domain/types';
import { useLive } from '../../hooks';
import { THEME_LABELS } from '../../labels';
import { Segmented } from '../../components/Fields';

export function SettingsHome() {
  const profile = useLive(getProfile);
  return (
    <div>
      <h1>הגדרות</h1>
      <div class="list">
        <a href="#/settings/profile">פרופיל</a>
        <a href="#/settings/equipment">ציוד ומיקומים</a>
        <a href="#/settings/targets">יעדים ומחשבון קלוריות</a>
        <a href="#/settings/phases">שלבים</a>
        <a href="#/settings/week">תוכנית שבועית ותבניות</a>
        <a href="#/settings/backup">גיבוי ושחזור</a>
      </div>
      {profile && (
        <div class="card">
          <Segmented<ThemeMode>
            label="תצוגה"
            value={profile.settings.themeMode}
            options={(Object.keys(THEME_LABELS) as ThemeMode[]).map((v) => ({ value: v, label: THEME_LABELS[v] }))}
            onChange={(themeMode) => updateProfile({ settings: { ...profile.settings, themeMode } })}
          />
        </div>
      )}
      <p class="muted small">מבחן פתיחה, הורדת עומס, מגבלת תמונות והוראות Apple Health יתווספו בשלבים הבאים.</p>
    </div>
  );
}
