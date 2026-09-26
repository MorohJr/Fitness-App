// עזרים משותפים לרשומות (3.3)
import type { BaseRecord } from '../../domain/types';
import { clock } from '../clock';

export function newBase(): BaseRecord {
  const now = clock.iso();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null };
}

export function touched<T extends BaseRecord>(rec: T, patch: Partial<T> = {}): T {
  return { ...rec, ...patch, updatedAt: clock.iso() };
}

export const alive = <T extends { deletedAt: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
