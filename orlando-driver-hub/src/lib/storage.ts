import { useEffect, useState } from 'react';

export const KEYS = {
  lastGuide: 'orlando_driver_last_guide_v1',
  bookmarks: 'orlando_driver_bookmarks_v1',
  notes: 'orlando_driver_shift_notes_v1',
  checklist: 'orlando_driver_shift_checklist_v1',
  costs: 'orlando_driver_costs_v1',
  setup: 'orlando_driver_setup_v1',
} as const;

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode). The app keeps working in memory.
  }
}

/** useState that mirrors itself into localStorage. */
export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));
  useEffect(() => writeLocal(key, value), [key, value]);
  return [value, setValue] as const;
}
