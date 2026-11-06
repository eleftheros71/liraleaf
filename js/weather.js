// Optional weather for outdoor plants via Open-Meteo (free, no API key).
// Only rounded coordinates are sent, and only when the user enables weather.
const CACHE = 'liraleaf:weather';
const TTL = 3 * 3600 * 1000;

export async function getWeather(lat, lon) {
  if (lat == null || lon == null) return null;
  const la = Number(lat).toFixed(2), lo = Number(lon).toFixed(2);
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (c && c.key === `${la},${lo}` && Date.now() - c.at < TTL) return c.data;
  } catch { /* ignore */ }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` +
    '&daily=temperature_2m_max,precipitation_sum&past_days=1&forecast_days=1&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  const j = await res.json();
  const p = j.daily?.precipitation_sum || [];
  const t = j.daily?.temperature_2m_max || [];
  const data = { maxTemp: t[t.length - 1] ?? null, rainMm24h: p.reduce((a, b) => a + (b || 0), 0) };
  try { localStorage.setItem(CACHE, JSON.stringify({ key: `${la},${lo}`, at: Date.now(), data })); } catch { /* ignore */ }
  return data;
}

export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }),
      (e) => reject(e), { maximumAge: 3600e3, timeout: 10000 });
  });
}
