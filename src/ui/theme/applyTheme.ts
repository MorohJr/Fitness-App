// מצב תצוגה: כהה בלבד מ-2.11 (3.7). ההגדרה הישנה בפרופיל נשמרת אבל לא משפיעה
import type { ThemeMode } from '../../domain/types';

export function applyTheme(_mode?: ThemeMode): void {
  delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#16171a');
}
