import 'dotenv/config';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { CORRIDORS, DEMAND_RATINGS, EVENT_TYPES, SEVERITIES, SURGE_TIERS, type Corridor, type GuideEvent, type Source } from './src/types';
import { HUBS, HUB_IDS } from './src/data/hubs';
import { extractSources, htmlToText, normalizeGuide, pageMentions, parseJsonLoose } from './src/lib/guide';
import { dayName, isIsoDate, weekDates } from './src/lib/time';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

/** Tried in order. On "model not found" or quota errors we move to the next one. */
const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.1-pro-preview,gemini-3-flash-preview,gemini-2.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- Gemini (server-side only) ----------

const s = (description: string): Schema => ({ type: Type.STRING, description });
const e = (values: readonly string[], description: string): Schema => ({ type: Type.STRING, enum: [...values], description });

const GUIDE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['headline', 'days', 'events', 'advisories'],
  propertyOrdering: ['headline', 'days', 'events', 'advisories'],
  properties: {
    headline: s('One or two sentences: the single most important thing to know about this week for a rideshare driver'),
    days: {
      type: Type.ARRAY,
      description: 'Exactly 7 entries, one per day, in order',
      items: {
        type: Type.OBJECT,
        required: ['date', 'demandRating', 'bestWindow', 'summary'],
        properties: {
          date: s('YYYY-MM-DD'),
          demandRating: e(DEMAND_RATINGS, 'Overall rideshare demand that day'),
          bestWindow: s('Best earning window in ET, e.g. "9:30 PM – 11:30 PM"'),
          summary: s('One sentence on what drives demand that day'),
        },
      },
    },
    events: {
      type: Type.ARRAY,
      description: 'Real, scheduled events found in search results. Empty if none.',
      items: {
        type: Type.OBJECT,
        required: ['name', 'venue', 'corridor', 'type', 'date', 'startTime', 'endTime', 'pickupTips', 'surgeTier', 'attendance', 'hubId', 'sourceUrl'],
        properties: {
          name: s('Event name exactly as the source page writes it'),
          venue: s('Venue name'),
          corridor: e(CORRIDORS, 'Orlando corridor'),
          type: e(EVENT_TYPES, 'Event type'),
          date: s('YYYY-MM-DD'),
          startTime: s('Start time, 24h HH:MM, or empty string if the source gives none'),
          endTime: s('Expected end or let-out time, 24h HH:MM. Estimate from typical duration if not published.'),
          pickupTips: s('One or two sentences: where riders exit and where to stage'),
          surgeTier: e(SURGE_TIERS, 'Expected surge intensity'),
          attendance: s('Approximate attendance, e.g. "18,000", or empty'),
          hubId: e(HUB_IDS, 'Closest staging hub'),
          sourceUrl: s('Direct URL of the official page for this event (venue, team, or organizer site)'),
        },
      },
    },
    advisories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['title', 'detail', 'severity'],
        properties: {
          title: s('Short title'),
          detail: s('What to expect and what to do'),
          severity: e(SEVERITIES, 'Severity'),
        },
      },
    },
  },
};

function buildPrompt(weekOf: string, corridors: Corridor[]): string {
  const dates = weekDates(weekOf);
  const hubList = HUBS.map((h) => `${h.id} = ${h.name}`).join('; ');
  return [
    `You research demand for one full-time Uber/Lyft driver in Orlando, Florida.`,
    `Use Google Search to find REAL scheduled events from ${dates[0]} (${dayName(dates[0])}) to ${dates[6]} (${dayName(dates[6])}).`,
    `Focus corridors: ${corridors.join(', ')}.`,
    `OCCC = Orange County Convention Center and International Drive. Disney = Walt Disney World and Disney Springs. Universal = Universal Orlando, Epic Universe, CityWalk. Sports/Concerts = Kia Center, Camping World Stadium, Inter&Co Stadium, Addition Financial Arena, Dr. Phillips Center. Other = MCO airport, Downtown nightlife, everything else.`,
    `Search the official calendars: OCCC events, Kia Center events, Camping World Stadium events, Orlando Magic and Orlando City schedules, Disney and Universal special events (after-hours parties, holiday events), and big festivals.`,
    `Rules:`,
    `- Only list an event if a search result shows it on that exact date. Never guess or fill gaps.`,
    `- sourceUrl must be the official page for that event, copied from results. If you have no such page, skip the event.`,
    `- Use the event name as the source writes it, so it can be matched against the page.`,
    `- Times are Eastern Time in 24h HH:MM.`,
    `- If a corridor has nothing notable, say so in an advisory. Do not pad.`,
    `- Return exactly 7 days: ${dates.join(', ')}.`,
    `- Advisories: road closures and construction on I-4, SR-528, SR-417; weather; heavy MCO travel days; police traffic plans for big events.`,
    `Valid hubId values: ${hubList}.`,
    `Respond with JSON only.`,
  ].join('\n');
}

let ai: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError(503, 'GEMINI_API_KEY is not set on the server.');
  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

function errStatus(err: unknown): number {
  const st = (err as { status?: unknown })?.status;
  return typeof st === 'number' ? st : 0;
}

function isSkippable(err: unknown): boolean {
  const st = errStatus(err);
  const msg = err instanceof Error ? err.message : String(err);
  return st === 404 || st === 429 || st === 403 || /not found|quota|exhausted|not supported|permission/i.test(msg);
}

async function callModel(model: string, prompt: string) {
  const client = getAi();
  try {
    return await client.models.generateContent({
      model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json', responseSchema: GUIDE_SCHEMA },
    });
  } catch (err) {
    // Some models reject structured output together with search grounding. Retry with the schema in the prompt.
    const msg = err instanceof Error ? err.message : String(err);
    if (errStatus(err) !== 400 && !/schema|mime|response_mime_type|controlled generation/i.test(msg)) throw err;
    console.warn(`[strategy] ${model}: structured output + search rejected, retrying without schema`);
    return client.models.generateContent({
      model,
      contents: `${prompt}\n\nFollow this JSON schema exactly:\n${JSON.stringify(GUIDE_SCHEMA)}`,
      config: { tools: [{ googleSearch: {} }] },
    });
  }
}

async function generateGuide(weekOf: string, corridors: Corridor[]) {
  const prompt = buildPrompt(weekOf, corridors);
  const failures: string[] = [];
  for (const model of MODELS) {
    try {
      const response = await callModel(model, prompt);
      const text = response.text ?? '';
      if (!text) throw new Error('empty response');
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        raw = parseJsonLoose(text);
      }
      const guide = normalizeGuide(raw, weekOf, corridors, model);
      const sources = extractSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks);
      await verifyEvents(guide.events, sources);
      return { guide, sources };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${model}: ${msg.slice(0, 160)}`);
      console.warn(`[strategy] ${model} failed:`, msg);
      if (!isSkippable(err)) break;
    }
  }
  const quota = failures.some((f) => /quota|429|exhausted/i.test(f));
  throw new HttpError(
    quota ? 429 : 502,
    quota
      ? 'Gemini free-tier limit reached. Try again later, or use your cached week.'
      : `Strategy generation failed. ${failures.join(' | ')}`,
  );
}

// ---------- Event verification (no AI: we load the source page and look for the event) ----------

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v = ip.toLowerCase();
  return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
}

async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  const host = u.hostname;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  try {
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) return null;
  } catch {
    return null;
  }
  return u;
}

async function fetchPageText(raw: string): Promise<{ ok: boolean; text: string; status: string }> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const safe = await safeUrl(url);
    if (!safe) return { ok: false, text: '', status: 'blocked or invalid URL' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch(safe, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DriverHubVerifier/1.0)', Accept: 'text/html,application/xhtml+xml' },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location')!, safe).toString();
        continue;
      }
      if (!res.ok) return { ok: false, text: '', status: `HTTP ${res.status}` };
      const reader = res.body?.getReader();
      if (!reader) return { ok: true, text: '', status: 'empty body' };
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (size < 1_500_000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      reader.cancel().catch(() => {});
      return { ok: true, text: htmlToText(Buffer.concat(chunks).toString('utf8')), status: 'loaded' };
    } catch (err) {
      return { ok: false, text: '', status: (err as Error).name === 'AbortError' ? 'timed out' : 'unreachable' };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, text: '', status: 'too many redirects' };
}

async function verifyEvents(events: GuideEvent[], sources: Source[]) {
  const groundedHosts = new Set(sources.map((src) => src.title.toLowerCase().replace(/^www\./, '')));
  const queue = [...events];
  const worker = async () => {
    for (let ev = queue.shift(); ev; ev = queue.shift()) {
      if (!ev.sourceUrl) {
        ev.verification = 'unconfirmed';
        ev.verificationNote = 'No source link was provided.';
        continue;
      }
      const host = new URL(ev.sourceUrl).hostname.replace(/^www\./, '');
      const page = await fetchPageText(ev.sourceUrl);
      if (page.ok && page.text && pageMentions(page.text, ev.name)) {
        ev.verification = 'confirmed';
        ev.verificationNote = `Source page (${host}) mentions this event.`;
      } else if (page.ok || groundedHosts.has(host)) {
        ev.verification = 'sourced';
        ev.verificationNote = page.ok
          ? `Source page (${host}) loaded, but the event name wasn't found on it. Pages that load content with scripts often look empty to us.`
          : `${host} appeared in the search results, but the page didn't load here (${page.status}).`;
      } else {
        ev.verification = 'unconfirmed';
        ev.verificationNote = `Source link didn't work (${page.status}).`;
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
}

// ---------- Guards ----------

const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

function accessOk(req: Request): boolean {
  const expected = process.env.APP_ACCESS_CODE;
  if (!expected) return true;
  const got = String(req.get('x-access-code') ?? '');
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------- App ----------

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, gemini: Boolean(process.env.GEMINI_API_KEY), accessCodeRequired: Boolean(process.env.APP_ACCESS_CODE), models: MODELS });
});

app.post('/api/strategy/generate', async (req: Request, res: Response) => {
  try {
    if (!accessOk(req)) throw new HttpError(401, 'Wrong or missing access code. Set it in Settings.');
    const { weekOf, corridors } = (req.body ?? {}) as { weekOf?: unknown; corridors?: unknown };
    if (!isIsoDate(weekOf)) throw new HttpError(400, 'weekOf must be a YYYY-MM-DD date.');
    const picked = Array.isArray(corridors) ? CORRIDORS.filter((c) => (corridors as unknown[]).includes(c)) : [];
    if (picked.length === 0) throw new HttpError(400, 'Pick at least one corridor.');
    if (rateLimited(req.ip ?? 'unknown')) throw new HttpError(429, 'Too many generations this hour. Use your cached week.');
    res.json(await generateGuide(weekOf, picked));
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (!(err instanceof HttpError)) console.error('[strategy] unexpected error:', err);
    res.status(status).json({ error: err instanceof Error ? err.message : 'Strategy generation failed.' });
  }
});

async function start() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (r, p) => p.endsWith('sw.js') && r.setHeader('Cache-Control', 'no-cache') }));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.listen(PORT, () => console.log(`Orlando Driver Hub on http://localhost:${PORT} (${isProd ? 'production' : 'development'}), models: ${MODELS.join(' → ')}`));
}

start();
