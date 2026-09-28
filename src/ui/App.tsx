// מבנה האפליקציה: באנרים, מסך, וניווט קבוע (פרק 7)
import { useEffect } from 'preact/hooks';
import { useRoute } from './router';
import { useLive } from './hooks';
import { getProfile } from '../data/repos/profile';
import { applyTheme } from './theme/applyTheme';
import { Banners } from './components/Banners';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Icon, type IconName } from './components/Icon';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsHome } from './screens/settings/SettingsHome';
import { ProfileScreen } from './screens/settings/ProfileScreen';
import { EquipmentScreen } from './screens/settings/EquipmentScreen';
import { TargetsScreen } from './screens/settings/TargetsScreen';
import { PhasesScreen } from './screens/settings/PhasesScreen';
import { WeekPlanScreen } from './screens/settings/WeekPlanScreen';
import { BackupScreen } from './screens/settings/BackupScreen';
import { WorkoutHome } from './screens/workout/WorkoutHome';
import { LibraryScreen } from './screens/workout/LibraryScreen';
import { ExerciseScreen } from './screens/workout/ExerciseScreen';
import { NewExerciseScreen } from './screens/workout/NewExerciseScreen';
import { OpeningTestScreen } from './screens/workout/OpeningTestScreen';
import { BodyScreen } from './screens/body/BodyScreen';
import { InjuriesScreen } from './screens/body/InjuriesScreen';
import { MeasureScreen } from './screens/body/MeasureScreen';
import { PhotosScreen } from './screens/body/PhotosScreen';
import { RecordsScreen } from './screens/body/RecordsScreen';
import { InjuryScreen } from './screens/body/InjuryScreen';
import { TodayScreen } from './screens/today/TodayScreen';
import { SupplementsScreen } from './screens/nutrition/SupplementsScreen';
import { LogScreen } from './screens/nutrition/LogScreen';
import { PantryScreen } from './screens/nutrition/PantryScreen';
import { PantryItemScreen } from './screens/nutrition/PantryItemScreen';
import { MealsScreen } from './screens/nutrition/MealsScreen';
import { MealScreen } from './screens/nutrition/MealScreen';
import { ShoppingScreen } from './screens/nutrition/ShoppingScreen';
import { HealthShortcutScreen } from './screens/settings/HealthShortcutScreen';
import { RunWorkout } from './screens/workout/RunWorkout';
import { WorkoutSummary } from './screens/workout/WorkoutSummary';
import { TemplateScreen } from './screens/settings/TemplateScreen';

const TABS: { path: string; icon: IconName; label: string }[] = [
  { path: '/dashboard', icon: 'dashboard', label: 'דשבורד' },
  { path: '/today', icon: 'today', label: 'היום' },
  { path: '/workout', icon: 'workout', label: 'אימון' },
  { path: '/nutrition', icon: 'nutrition', label: 'תזונה' },
  { path: '/body', icon: 'body', label: 'גוף ושיאים' },
  { path: '/settings', icon: 'settings', label: 'הגדרות' }
];

function screenFor(path: string) {
  // נתיבים עם מזהה
  const ex = /^\/workout\/exercise\/(.+)$/.exec(path);
  if (ex) return <ExerciseScreen id={decodeURIComponent(ex[1])} />;
  const inj = /^\/body\/injury\/(.+)$/.exec(path);
  if (inj) return <InjuryScreen id={inj[1] === 'new' ? null : decodeURIComponent(inj[1])} />;
  const ms = /^\/body\/measure\/(.+)$/.exec(path);
  if (ms) return <MeasureScreen id={ms[1] === 'new' ? null : ms[1]} />;
  const sum = /^\/workout\/summary\/(.+)$/.exec(path);
  if (sum) return <WorkoutSummary id={sum[1]} />;
  const tp = /^\/settings\/template\/(.+)$/.exec(path);
  if (tp) return <TemplateScreen id={tp[1]} />;
  const nlog = /^\/nutrition\/log\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  if (nlog) return <LogScreen date={nlog[1]} />;
  const pi = /^\/nutrition\/pantry\/(.+)$/.exec(path);
  if (pi) return <PantryItemScreen id={pi[1] === 'new' ? null : pi[1]} />;
  const ml = /^\/nutrition\/meal\/(.+)$/.exec(path);
  if (ml) return <MealScreen id={ml[1] === 'new' ? null : ml[1]} />;
  const day = /^\/today\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  if (day) return <TodayScreen date={day[1]} />;
  switch (path) {
    case '/dashboard': return <DashboardScreen />;
    case '/today': return <TodayScreen />;
    case '/nutrition/supplements': return <SupplementsScreen />;
    case '/settings/health': return <HealthShortcutScreen />;
    case '/workout': return <WorkoutHome />;
    case '/workout/library': return <LibraryScreen />;
    case '/workout/new-exercise': return <NewExerciseScreen />;
    case '/workout/test': return <OpeningTestScreen />;
    case '/workout/run': return <RunWorkout />;
    case '/nutrition': return <LogScreen />;
    case '/nutrition/pantry': return <PantryScreen />;
    case '/nutrition/meals': return <MealsScreen />;
    case '/nutrition/shopping': return <ShoppingScreen />;
    case '/body': return <BodyScreen />;
    case '/body/photos': return <PhotosScreen />;
    case '/body/records': return <RecordsScreen />;
    case '/body/injuries': return <InjuriesScreen />;
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
          <a key={t.path} href={`#${t.path}`} aria-label={t.label} title={t.label} aria-current={path === t.path || path.startsWith(t.path + '/') ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span class="txt">{t.label}</span>
          </a>
        ))}
      </nav>
      <div class="main-scroll" id="main-scroll">
        <main class="main">
          <Banners />
          <ErrorBoundary resetKey={path}>{screenFor(path)}</ErrorBoundary>
        </main>
      </div>
      <Toast />
    </div>
  );
}
