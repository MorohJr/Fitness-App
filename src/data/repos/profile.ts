// פרופיל: רשומה אחת (4.1)
import type { Profile } from '../../domain/types';
import { getDb } from '../db';
import { DEFAULT_EQUIPMENT, DEFAULT_LOCATIONS, DEFAULT_SETTINGS } from '../seed/defaults';
import { newBase, touched } from './base';

export function defaultProfile(): Profile {
  return {
    ...newBase(),
    sex: null,
    birthDate: null,
    heightCm: null,
    activityLevel: 'moderate',
    manualWeightKg: null,
    manualWeightDate: null,
    equipment: structuredClone(DEFAULT_EQUIPMENT),
    locations: structuredClone(DEFAULT_LOCATIONS),
    settings: { ...DEFAULT_SETTINGS }
  };
}

export async function getProfile(): Promise<Profile | undefined> {
  const rows = (await getDb().data('profile').toArray()) as Profile[];
  return rows.find((r) => !r.deletedAt);
}

export async function ensureProfile(): Promise<Profile> {
  const p = await getProfile();
  if (p) return p;
  const created = defaultProfile();
  await getDb().data('profile').add(created);
  return created;
}

export async function updateProfile(patch: Partial<Omit<Profile, 'id' | 'createdAt'>>): Promise<Profile> {
  const p = await ensureProfile();
  const next = touched<Profile>(p, patch as Partial<Profile>);
  await getDb().data('profile').put(next);
  return next;
}
