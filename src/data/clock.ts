// שעון אחד לכל שכבת הנתונים, כדי שבדיקות יוכלו "לזוז בזמן"
import { logicalDate } from '../domain/calc/dates';
import type { ISODate } from '../domain/types';

let nowFn: () => Date = () => new Date();

export const clock = {
  now: (): Date => nowFn(),
  today: (): ISODate => logicalDate(nowFn()),
  iso: (): string => nowFn().toISOString(),
  /** לבדיקות בלבד */
  set(fn: () => Date) {
    nowFn = fn;
  },
  reset() {
    nowFn = () => new Date();
  }
};
