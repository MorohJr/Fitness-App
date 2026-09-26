// מבנה האפליקציה: באנרים, מסך, וניווט קבוע (פרק 7)
import { useEffect } from 'preact/hooks';
import { useRoute } from './router';
import { useLive } from './hooks';
import { getProfile } from '../data/repos/profile';
import { applyTheme } from './theme/applyTheme';
import { Banners } from './components/Banners';
import { Toast } from './components/Toast';
import { DashboardScreen } from './screens/DashboardScreen';
import { Placeholder } from './screens/Placeholder';
import { SettingsHome } from './screens/settings/SettingsHome';
import { ProfileScreen } from './screens/settings/ProfileScreen';
import { EquipmentScreen } from './screens/settings/EquipmentScreen';
import { TargetsScreen } from './screens/settings/TargetsScreen';
import { PhasesScreen } from './screens/settings/PhasesScreen';
import { WeekPlanScreen } from './screens/settings/WeekPlanScreen';
import { BackupScreen } from './screens/settings/BackupScreen';

const TABS = [
  { path: '/dashboard', icon: '📊', label: 'דשבורד' },
  { path: '/today', icon: '📝', label: 'היום' },
  { path: '/workout', icon: '🏋️', label: 'אימון' },
  { path: '/nutrition', icon: '🥗', label: 'תזונה' },
  { path: '/body', icon: '📈', label: 'גוף ושיאים' },
  { path: '/settings', icon: '⚙️', label: 'הגדרות' }
];

function screenFor(path: string) {
  switch (path) {
    case '/dashboard': return <DashboardScreen />;
    case '/today': return <Placeholder title="היום" stage={3} />;
    case '/workout': return <Placeholder title="אימון" stage={5} />;
    case '/nutrition': return <Placeholder title="תזונה" stage={4} />;
    case '/body': return <Placeholder title="גוף ושיאים" stage={6} />;
    case '/settings': return <SettingsHome />;
    case '/settings/profile': return <ProfileScreen />;
    case '/settings/equipment': return <EquipmentScreen />;
    case '/settings/targets': return <TargetsScreen />;
    case '/settings/phases': return <PhasesScreen />;
    case '/settings/week': return <WeekPlanScreen />;
    case '/settings/backup': return <BackupScreen />;
    default: return <DashboardScreen />;
  }
}

export function App() {
  const path = useRoute();
  const profile = useLive(getProfile);
  useEffect(() => {
    if (profile) applyTheme(profile.settings.themeMode);
  }, [profile?.settings.themeMode]);

  return (
    <div class="app">
      <nav class="nav" aria-label="ניווט ראשי">
        {TABS.map((t) => (
          <a key={t.path} href={`#${t.path}`} aria-current={path === t.path || path.startsWith(t.path + '/') ? 'page' : undefined}>
            <span class="ico" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
      <main class="main">
        <Banners />
        {screenFor(path)}
      </main>
      <Toast />
    </div>
  );
}
