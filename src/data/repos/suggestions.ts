// הצעות ממתינות (E2, 4.2)
import type { ISODate, Suggestion, SuggestionType } from '../../domain/types';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';

export async function listSuggestions(): Promise<Suggestion[]> {
  return alive((await getDb().data('suggestions').toArray()) as Suggestion[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listPendingSuggestions(): Promise<Suggestion[]> {
  return (await listSuggestions()).filter((s) => s.status === 'pending');
}

export type NewSuggestion = Pick<Suggestion, 'type' | 'refId' | 'payload' | 'title' | 'reason'> & { date?: ISODate };

/** יוצר הצעה, אלא אם יש כבר הצעה ממתינה מאותו סוג לאותה רשומה (ולאותו יום) */
export async function createSuggestion(s: NewSuggestion): Promise<Suggestion | null> {
  const date = s.date ?? clock.today();
  const pending = await listPendingSuggestions();
  if (pending.some((p) => p.type === s.type && p.refId === s.refId && p.date === date)) return null;
  if (pending.some((p) => p.type === s.type && p.refId === s.refId && s.refId !== null)) return null;
  const rec: Suggestion = { ...newBase(), ...s, date, status: 'pending', decidedAt: null, choice: null };
  await getDb().data('suggestions').add(rec);
  return rec;
}

/** רישום החלטה (שנשמרת גם כהיסטוריה) */
export async function markDecision(id: string, status: 'approved' | 'rejected', choice: string | null = null): Promise<Suggestion> {
  const cur = (await getDb().data('suggestions').get(id)) as Suggestion;
  const next = touched(cur, { status, decidedAt: clock.iso(), choice });
  await getDb().data('suggestions').put(next);
  return next;
}

/** החלטה ישירה שנשמרת כהצעה שהוחלטה (למשל אימון שהוחמץ) */
export async function recordDecision(s: NewSuggestion, status: 'approved' | 'rejected', choice: string | null = null): Promise<Suggestion> {
  const rec: Suggestion = { ...newBase(), ...s, date: s.date ?? clock.today(), status, decidedAt: clock.iso(), choice };
  await getDb().data('suggestions').add(rec);
  return rec;
}

export async function lastSuggestionOfType(type: SuggestionType): Promise<Suggestion | undefined> {
  return (await listSuggestions()).filter((s) => s.type === type).sort((a, b) => b.date.localeCompare(a.date))[0];
}
