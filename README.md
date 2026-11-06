# 🌿 LiraLeaf

A plant-care app that lives on your phone. No account is needed, and your plants stay on your device.

- **Today** — what to water, fertilize, mist, repot or clean, with Done / +1 day / Skip.
- **Smart schedule** — each plant's watering interval adapts to its species, pot size and material, soil, drainage, light, distance to the window and the season. Tap a plant to see *why*.
- **Weather (optional)** — for outdoor plants, heat brings watering forward and rain counts as a watering. Weather comes from Open-Meteo, using a rounded location.
- **Sites** — rooms, balconies and garden beds, each with its own light and humidity.
- **Journal** — notes and a photo for every plant.
- **Light meter** — compare how bright different spots are using the camera.
- **Plant doctor** — pick a symptom and get likely causes ranked for *that* plant.
- **Reminders and backups** — a daily notification, plus export/import of all your data.

## Run

```bash
python -m http.server 5173 --directory .
```

Then open http://localhost:5173. Camera and notifications need `localhost` or HTTPS.

## Putting it on an Android phone (Samsung Galaxy)

A phone can't use `localhost` on your PC. Over plain `http://` on your Wi-Fi, Android won't install the app or allow the camera and notifications. The `app/` folder therefore has to be hosted somewhere with **HTTPS**. Any static host works (GitHub Pages, Netlify, Cloudflare Pages): upload the contents of `app/` as they are, with no build step.

Then on the phone:

1. Open the HTTPS address in **Chrome** or **Samsung Internet**.
2. Install it:
   - Chrome: ⋮ menu → **Add to Home screen** → **Install**
   - Samsung Internet: ☰ menu → **Add page to** → **Home screen**
3. Open **LiraLeaf** from the home screen. It runs full-screen like a normal app and works offline.
4. In **Settings → Reminders**, turn on notifications and allow them when Android asks.

**Data lives only on that phone**, inside the browser that installed it. Use **Settings → Export backup** now and then. Uninstalling the app or clearing that browser's site data erases it.

**Publishing an update:** change `CACHE` in `sw.js` (e.g. `liraleaf-v4` → `liraleaf-v5`) and upload the files again. The installed app picks up the new version the next time it is opened online and reloads itself once.

**Light meter on Galaxy phones:** Chrome doesn't expose the phone's light sensor to web apps by default, so the meter uses the camera estimate. Treat it as a relative reading (darker / brighter spot), not exact lux.

## Test

```bash
node --test tests/
```

## Not included

The following need a backend or a paid model:

- photo-based species identification
- AI diagnosis
- accounts and sync
- reminders while the app is closed: currently it notifies when opened or while running. Chrome on Android's periodic background sync could cover this without a server; this is not built yet.
- a large plant catalogue (only 16 species are built in)
