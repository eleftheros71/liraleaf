# Orlando Driver Hub

Personal, single-driver rideshare strategy and live corridor dispatch for Orlando, FL.
No chat, feeds or community features. One driver, one account.

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4, lucide-react, motion, recharts
- `server.ts`: Express on port 3000. Vite middleware in dev, `dist/` in production
- Gemini (`gemini-3.1-pro-preview`) with Google Search grounding, called **only** from the server
- Firebase Auth (Google) + Firestore for the profile and cached weekly guides
- localStorage for offline use in weak-signal areas

## Setup

```bash
cd orlando-driver-hub
npm install
cp .env.example .env   # fill GEMINI_API_KEY and the VITE_FIREBASE_* values
npm run dev            # http://localhost:3000
```

Production:

```bash
npm run build
npm start              # serves dist/ on PORT (default 3000)
```

Without Firebase values the app still runs: guides stay on the device and sign-in is hidden.
Without `GEMINI_API_KEY` the Staging, MCO, Egress and Shift tools work; only generation fails.

### Firebase

1. Create a project, enable **Authentication → Google** and **Firestore**.
2. Add your domain (and `localhost`) to Auth → Authorized domains.
3. Deploy the rules: `npx firebase-tools deploy --only firestore:rules`.

Data layout (everything else is denied by `firestore.rules`):

| Path | Contents |
|---|---|
| `users/{uid}` | `displayName`, `email`, `corridors`, `createdAt`, `updatedAt` |
| `users/{uid}/guides/guide_{YYYY-MM-DD}` | `ownerUid`, `weekOf`, `corridors`, `guideJson`, `sources`, `createdAt` |

## API

`POST /api/strategy/generate` with `{ "weekOf": "2026-11-23", "corridors": ["OCCC", "Disney"] }`
returns `{ guide, sources }`. The model output is validated and normalized server-side
(7 days, valid enums, known staging hubs). Sources come from
`groundingMetadata.groundingChunks`, de-duplicated by URL. If the model rejects
`responseSchema` together with search grounding, the server retries without the schema
and parses JSON from text. A simple in-memory limit (12 generations/hour per IP) protects your quota.

The endpoint has no auth. Keep the server private (localhost, VPN, or behind your host's auth)
if you deploy it publicly.

## localStorage keys

| Key | Purpose |
|---|---|
| `orlando_driver_last_guide_v1` | Last loaded guide + sources (Resume Week) |
| `orlando_driver_bookmarks_v1` | Saved event IDs |
| `orlando_driver_shift_notes_v1` | Personal shift notes |
| `orlando_driver_shift_checklist_v1` | Shift leg check-offs |
| `orlando_driver_costs_v1` | Fuel & tolls and vehicle tier |
| `orlando_driver_setup_v1` | Week and corridor selection |

## Data caveats

MCO banks, curb levels, park show times and hub pickup pins in `src/data/` are typical
patterns, not live feeds. Hours change by season and airport signage changes. Verify before
you commit to a long deadhead.

## Scripts

- `npm run dev`: dev server with HMR
- `npm run build`: client build to `dist/`
- `npm start`: production server
- `npm run typecheck`
- `npm test`: time windows, guide normalization, citations, earnings math
