import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { CORRIDORS, DEMAND_RATINGS, EVENT_TYPES, SEVERITIES, SURGE_TIERS, type Corridor } from './src/types';
import { HUBS, HUB_IDS } from './src/data/hubs';
import { extractSources, normalizeGuide, parseJsonLoose } from './src/lib/guide';
import { isIsoDate, weekDates, dayName } from './src/lib/time';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';
const MODEL = 'gemini-3.1-pro-preview';

// ---------- Gemini (server-side only) ----------

const strField = (description: string): Schema => ({ type: Type.STRING, description });
const enumField = (values: readonly string[], description: string): Schema => ({
  type: Type.STRING,
  enum: [...values],
  description,
});

const GUIDE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['globalStrategy', 'days', 'events', 'advisories'],
  propertyOrdering: ['globalStrategy', 'days', 'events', 'advisories'],
  properties: {
    globalStrategy: {
      type: Type.OBJECT,
      required: ['topEarningDay', 'topEarningDayReason', 'primaryFocus', 'primaryFocusReason', 'surgeAlert', 'surgeAlertReason'],
      properties: {
        topEarningDay: strField('Single best day, e.g. "Saturday, Nov 21"'),
        topEarningDayReason: strField('2-3 sentences explaining why'),
        primaryFocus: strField('Corridor or venue to prioritize this week'),
        primaryFocusReason: strField('2-3 sentences of reasoning'),
        surgeAlert: strField('The single biggest surge window of the week'),
        surgeAlertReason: strField('2-3 sentences: what causes it and how to position'),
      },
    },
    days: {
      type: Type.ARRAY,
      description: 'Exactly 7 entries, one per day of the requested week, in order',
      items: {
        type: Type.OBJECT,
        required: ['date', 'demandRating', 'demandScore', 'surgeWindow', 'summary'],
        properties: {
          date: strField('YYYY-MM-DD'),
          demandRating: enumField(DEMAND_RATINGS, 'Overall rideshare demand'),
          demandScore: { type: Type.INTEGER, description: '0-100 demand index' },
          surgeWindow: strField('Expected surge window in ET, e.g. "9:30 PM – 11:30 PM"'),
          summary: strField('One sentence on what drives demand'),
        },
      },
    },
    events: {
      type: Type.ARRAY,
      description: 'Real, verified high-demand events in the Orlando area during the week',
      items: {
        type: Type.OBJECT,
        required: ['id', 'name', 'venue', 'corridor', 'type', 'date', 'startTime', 'endTime', 'pickupTimes', 'dispatchStrategy', 'surgeTier', 'expectedAttendance', 'stagingHubId', 'sourceUrl'],
        properties: {
          id: strField('kebab-case unique id'),
          name: strField('Event name'),
          venue: strField('Venue name'),
          corridor: enumField(CORRIDORS, 'Orlando corridor'),
          type: enumField(EVENT_TYPES, 'Event type'),
          date: strField('YYYY-MM-DD'),
          startTime: strField('Start time ET, e.g. "7:30 PM"'),
          endTime: strField('Expected end/let-out time ET'),
          pickupTimes: strField('Best pickup windows in full, e.g. "Pre-event 5:45–7:00 PM drop-offs; let-out 10:15–11:00 PM"'),
          dispatchStrategy: strField('Full, specific positioning and dispatch advice (2-4 sentences)'),
          surgeTier: enumField(SURGE_TIERS, 'Expected surge intensity'),
          expectedAttendance: strField('Approximate attendance, e.g. "18,000"'),
          stagingHubId: enumField(HUB_IDS, 'Closest staging hub id'),
          sourceUrl: strField('URL of the page confirming the event, or empty string'),
        },
      },
    },
    advisories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['title', 'detail', 'severity', 'corridor'],
        properties: {
          title: strField('Short advisory title'),
          detail: strField('What to expect and what to do'),
          severity: enumField(SEVERITIES, 'Severity'),
          corridor: enumField(CORRIDORS, 'Affected corridor'),
        },
      },
    },
  },
};

function buildPrompt(weekOf: string, corridors: Corridor[]): string {
  const dates = weekDates(weekOf);
  const hubList = HUBS.map((h) => `${h.id} = ${h.name}`).join('; ');
  return [
    `You are a dispatch strategist for a single full-time rideshare driver (Uber/Lyft) in Orlando, Florida.`,
    `Use Google Search to find REAL scheduled events for the week ${dates[0]} (${dayName(dates[0])}) through ${dates[6]} (${dayName(dates[6])}).`,
    `Focus corridors: ${corridors.join(', ')}.`,
    `Corridor meanings: OCCC = Orange County Convention Center and International Drive; Disney = Walt Disney World parks, Disney Springs; Universal = Universal Orlando, Epic Universe, CityWalk; Sports/Concerts = Kia Center, Camping World Stadium, Inter&Co Stadium, Amway-area and Downtown venues, Addition Financial Arena; Other = MCO airport demand, Downtown nightlife, and anything else.`,
    `Check conventions at OCCC, concerts and games at Kia Center and Camping World Stadium, theme park special events (after-hours parties, extended hours, holiday events), festivals and big hotel events.`,
    `Only include events you can confirm from search results. Put the confirming URL in sourceUrl. Do not invent events. If a corridor has nothing notable, say so in advisories instead of padding.`,
    `Return exactly 7 days with dates ${dates.join(', ')}. All times are Eastern Time.`,
    `Write full sentences in reasoning and dispatch fields. Never truncate.`,
    `Valid stagingHubId values: ${hubList}.`,
    `Advisories should cover road closures, construction on I-4 / SR-528 / SR-417, weather, MCO rules or heavy airport days, and police traffic plans for big events.`,
    `Respond with JSON only, matching the schema.`,
  ].join('\n');
}

let ai: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError(503, 'GEMINI_API_KEY is not set on the server.');
  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function generateGuide(weekOf: string, corridors: Corridor[]) {
  const client = getAi();
  const contents = buildPrompt(weekOf, corridors);
  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: GUIDE_SCHEMA,
        temperature: 0.4,
      },
    });
  } catch (err) {
    // Some model/tool combinations reject structured output alongside search grounding.
    // Retry with the schema described in the prompt and parse JSON from text.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/schema|mime|tool|INVALID_ARGUMENT/i.test(msg)) throw err;
    console.warn('[strategy] structured+search rejected, retrying without responseSchema:', msg);
    response = await client.models.generateContent({
      model: MODEL,
      contents: `${contents}\n\nJSON schema to follow exactly:\n${JSON.stringify(GUIDE_SCHEMA)}`,
      config: { tools: [{ googleSearch: {} }], temperature: 0.4 },
    });
  }

  const text = response.text ?? '';
  if (!text) throw new HttpError(502, 'Gemini returned an empty response.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = parseJsonLoose(text);
  }
  const guide = normalizeGuide(raw, weekOf, corridors);
  const sources = extractSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks);
  return { guide, sources };
}

// ---------- Tiny in-memory rate limit (protects the API key's quota) ----------

const hits = new Map<string, number[]>();
const LIMIT = 12;
const WINDOW_MS = 60 * 60 * 1000;
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

// ---------- App ----------

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, gemini: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/strategy/generate', async (req: Request, res: Response) => {
  try {
    const { weekOf, corridors } = (req.body ?? {}) as { weekOf?: unknown; corridors?: unknown };
    if (!isIsoDate(weekOf)) throw new HttpError(400, 'weekOf must be a YYYY-MM-DD date.');
    const picked = Array.isArray(corridors)
      ? CORRIDORS.filter((c) => (corridors as unknown[]).includes(c))
      : [];
    if (picked.length === 0) throw new HttpError(400, 'Pick at least one corridor.');
    if (rateLimited(req.ip ?? 'unknown')) throw new HttpError(429, 'Too many generations this hour. Use the cached guide.');

    const result = await generateGuide(weekOf, picked);
    res.json(result);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 502;
    const message = err instanceof Error ? err.message : 'Strategy generation failed.';
    if (!(err instanceof HttpError)) console.error('[strategy] generation failed:', err);
    res.status(status).json({ error: status === 502 ? `Strategy generation failed: ${message}` : message });
  }
});

async function start() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.listen(PORT, () => {
    console.log(`Orlando Driver Hub on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

start();
