// Local-first persistence. Everything stays on this device (localStorage).
const KEY = 'liraleaf:v1';
let memory = null; // fallback when storage is blocked

const empty = () => ({ version: 1, sites: [], plants: [], settings: { lat: null, lon: null, useWeather: false, notify: false, lastNotified: null } });

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return memory || empty();
}

export function save(state) {
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch { return false; } // quota (photos) or blocked storage
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

export function exportJson(state) {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.plants) || !Array.isArray(data.sites)) throw new Error('Not a LiraLeaf backup');
  return { ...empty(), ...data };
}
