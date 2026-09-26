// מצב תצוגה: לפי המכשיר, או קבוע (3.7)
import type { ThemeMode } from '../../domain/types';

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1115' : '#f4f5f7');
}
