# Orlando Driver Hub

A phone-first app for one rideshare driver in Orlando. It answers three questions:

1. **Where should I be right now?** The Now screen ranks the next few hours of demand: MCO arrival banks, park closings, recurring nightlife windows and this week's events. It adds drive time if you share your location, and weighs in your own earnings history once you have a few shifts per area.
2. **What's happening this week?** Weekly research with Gemini and Google Search. Before an event shows up, the server loads its source page and checks that the page actually mentions it. Every event carries a label: *Confirmed*, *Source found*, *Unconfirmed* or *Added by you*.
3. **What do my shifts really earn?** Start and stop a shift timer, log earnings, tips, miles and tolls, and see net per hour after gas and wear, by day, time of day and area. Export to CSV for taxes.

Everything except the weekly research works offline. It installs to the home screen as an app.

## Run it

```bash
cd orlando-driver-hub
npm install
cp .env.example .env    # add GEMINI_API_KEY (free from Google AI Studio)
npm run dev             # http://localhost:3000
```

Production:

```bash
npm run build
npm start               # serves dist/ and the API on PORT (default 3000)
```

## Hosting on Render (free)

The repo root has a `render.yaml` Blueprint.

1. Sign in at render.com with GitHub and give it access to this repo.
2. **New → Blueprint**, pick the repo and the branch that has the app.
3. Render asks for two secrets:
   - `GEMINI_API_KEY`: your key from Google AI Studio.
   - `APP_ACCESS_CODE`: any passphrase. You'll type the same one in the app under **Settings → Server access code**.
4. Wait for the first deploy (a few minutes). Open the `https://….onrender.com` address.
5. Check `https://….onrender.com/api/health`: `"gemini": true` means the key is set.
6. On your phone, open the address in Safari (iPhone) or Chrome (Android) and choose **Add to Home Screen**.

The free plan sleeps after about 15 minutes without visits. The installed app still opens instantly from its offline cache; only the first research call after a nap waits up to a minute while the server wakes.

## Gemini on the free plan

- The research call runs **only on the server**. The key never reaches the browser.
- It runs when you tap **Research**, not when you open the app. Results are saved on the phone (and in the cloud if you sign in), so one call per week is normal.
- `GEMINI_MODELS` is a fallback list. If a model isn't on your plan, or you've hit its free-tier limit, the server tries the next one. The Week screen shows which model produced the research.
- Google's free tier may use prompts to improve their products. The prompts here are only "find Orlando events for this week".

### How events get checked

1. The prompt asks only for events seen in search results, each with its official page.
2. The server drops anything outside the requested week and normalizes times, venues and hubs.
3. For each event, the server fetches the source page (public addresses only, 7 s timeout, 1.5 MB cap) and looks for the event name in the visible text.
   - Found: **Confirmed**.
   - Page loads but the name isn't there (common with script-heavy ticket sites), or the site appeared in Google's grounding results: **Source found**.
   - No link or a dead link: **Unconfirmed**. These get a 40% lower score on the Now screen and a warning.

## Protecting your quota

If the server is reachable from the internet, set `APP_ACCESS_CODE` and enter the same code in the app's Settings. The research endpoint also allows at most 10 calls per hour per IP.

## Cloud backup (optional)

Without Firebase settings, all data stays on the phone. Use **Settings → Backup file** now and then.

With Firebase:

1. Create a project and enable **Authentication → Google** and **Firestore**.
2. Add your domain to Auth → Authorized domains.
3. Fill the `VITE_FIREBASE_*` values and rebuild.
4. Deploy the rules: `npx firebase-tools deploy --only firestore:rules`.

| Path | Contents |
|---|---|
| `users/{uid}/shifts/{id}` | One shift. Deletes are kept as tombstones so they sync across devices. |
| `users/{uid}/guides/guide_{YYYY-MM-DD}` | Cached weekly research |

Everything else is denied by `firestore.rules`.

## How the Now ranking works

`src/lib/opportunities.ts`, pure and tested. For each demand window in the next 8 hours:

- **Base strength** from the playbook (`src/data/ops.ts`) or the event's demand tier. Unconfirmed events get ×0.6.
- **Timing**: active now ×1.0, starting within 30 min ×0.95, within 90 min ×0.85, later less.
- **Your history**: once you have 3+ shifts tagged with that area in that time of day, your net $/hr there vs. your overall average (clamped to 0.8–1.25×).
- **Distance** (if location is on): drops spots you can't reach before the window closes. Long drives cost up to 35%. It also shows a "leave by" time.

Convention windows at OCCC only count on dates with a convention in your week's events.

## Data caveats

Airport banks, curb levels, park show times and pickup spots in `src/data/` are typical patterns I wrote, not live feeds. Check them against current schedules and signage, and edit the files to match what you see on the road.

## Scripts

- `npm run dev`: dev server with hot reload
- `npm run build`: production build to `dist/`
- `npm start`: production server
- `npm run typecheck`
- `npm test`: ranking, earnings math, verification matching, time zones
