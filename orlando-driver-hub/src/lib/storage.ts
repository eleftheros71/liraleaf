import { useEffect, useState } from 'react';

export const KEYS = {
  guide: 'odh_guide_v2',
  manualEvents: 'odh_manual_events_v1',
  saved: 'odh_saved_events_v1',
  shifts: 'odh_shifts_v1',
  activeShift: 'odh_active_shift_v1',
  settings: 'odh_settings_v1',
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
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode). The app keeps working in memory.
  }
}

/** useState mirrored into localStorage. */
export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));
  useEffect(() => writeLocal(key, value), [key, value]);
  return [value, setValue] as const;
}
