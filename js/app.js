import { SPECIES, byId } from './species.js';
import { computeTasks, completeTask, skipTask, snoozeTask, undoLast, wateringInterval, intervalFor,
  TASK_LABEL, TASK_TYPES, startOfDay } from './care.js';
import { load, save, uid, exportJson, importJson } from './store.js';
import { getWeather, locate } from './weather.js';
import { SYMPTOMS, diagnose } from './doctor.js';
import { startLightMeter } from './lightmeter.js';

let state = load();
let weather = null;
let view = 'today';
let stopMeter = null;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = { water: '💧', fertilize: '🌱', mist: '🌫️', repot: '🪴', clean: '🧽' };
const ctx = () => ({ date: new Date(), lat: state.settings.lat ?? 50, weather: state.settings.useWeather ? weather : null, speciesById: byId });
const siteOf = (p) => state.sites.find((s) => s.id === p.siteId);
const plantName = (p) => p.nickname || byId(p.speciesId)?.name || 'Plant';
const fmtDue = (t) => t.overdue > 0 ? `${t.overdue} day${t.overdue > 1 ? 's' : ''} late` : t.inDays === 0 ? 'Today' : t.inDays === 1 ? 'Tomorrow' : `In ${t.inDays} days`;

function persist() {
  if (!save(state)) toast('Could not save — storage is full or blocked. Try removing photos or exporting a backup.');
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3500);
}
function updatePlant(id, fn) {
  state.plants = state.plants.map((p) => (p.id === id ? fn(p) : p));
  persist(); render();
}

// ---------------- Views ----------------
function render() {
  document.querySelectorAll('nav button').forEach((b) => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  if (view !== 'tools' && stopMeter) { stopMeter(); stopMeter = null; }
  const main = $('#main');
  main.innerHTML = ({ today: viewToday, plants: viewPlants, sites: viewSites, tools: viewTools, settings: viewSettings })[view]();
}

function emptyState(text, btn) {
  return `<div class="empty"><p>${text}</p>${btn || ''}</div>`;
}

function viewToday() {
  if (!state.sites.length) return `<h1>Welcome to LiraLeaf</h1>` + emptyState('Start by adding a place where your plants live — a room, balcony or garden bed.', '<button class="primary" data-act="add-site">Add a site</button>');
  if (!state.plants.length) return `<h1>Today</h1>` + emptyState('No plants yet.', '<button class="primary" data-act="add-plant">Add a plant</button>');
  const tasks = computeTasks(state, ctx());
  const today = startOfDay(new Date());
  const due = tasks.filter((t) => t.due <= today);
  const soon = tasks.filter((t) => t.due > today && t.inDays <= 7);
  const wx = state.settings.useWeather && weather ? `<p class="muted">Outdoors: ${Math.round(weather.maxTemp)}°C max, ${weather.rainMm24h.toFixed(1)} mm rain in 24 h</p>` : '';
  return `<h1>Today</h1>${wx}
    <section><h2>Due now <span class="count">${due.length}</span></h2>
      ${due.length ? `<ul class="tasks">${due.map((t) => taskRow(t, true)).join('')}</ul>` : '<p class="muted">All caught up. 🌿</p>'}
    </section>
    <section><h2>Next 7 days</h2>
      ${soon.length ? `<ul class="tasks">${soon.map((t) => taskRow(t, false)).join('')}</ul>` : '<p class="muted">Nothing scheduled.</p>'}
    </section>`;
}

function taskRow(t, actionable) {
  const p = state.plants.find((x) => x.id === t.plantId);
  const site = siteOf(p);
  return `<li class="task ${t.overdue ? 'late' : ''}">
    <span class="ticon" aria-hidden="true">${ICON[t.type]}</span>
    <button class="linkish" data-act="open-plant" data-id="${p.id}"><strong>${TASK_LABEL[t.type]}</strong> ${esc(plantName(p))}
      <small>${esc(site?.name || '')} · ${fmtDue(t)} · every ${t.interval} d</small></button>
    ${actionable ? `<span class="btns">
      <button class="primary" data-act="done" data-id="${p.id}" data-type="${t.type}" aria-label="Mark done">Done</button>
      <button data-act="snooze" data-id="${p.id}" data-type="${t.type}" aria-label="Snooze one day">+1d</button>
      <button data-act="skip" data-id="${p.id}" data-type="${t.type}" aria-label="Skip">Skip</button></span>` : ''}
  </li>`;
}

function viewPlants() {
  const head = `<div class="row"><h1>Plants</h1><button class="primary" data-act="add-plant" ${state.sites.length ? '' : 'disabled'}>Add plant</button></div>`;
  if (!state.plants.length) return head + emptyState(state.sites.length ? 'No plants yet.' : 'Add a site first.');
  return head + state.sites.map((s) => {
    const ps = state.plants.filter((p) => p.siteId === s.id);
    if (!ps.length) return '';
    return `<h2>${esc(s.name)}</h2><div class="grid">${ps.map(plantCard).join('')}</div>`;
  }).join('');
}

function plantCard(p) {
  const sp = byId(p.speciesId);
  const img = p.photo ? `<img src="${p.photo}" alt="">` : `<div class="ph" aria-hidden="true">🪴</div>`;
  return `<button class="card" data-act="open-plant" data-id="${p.id}">${img}<span><strong>${esc(plantName(p))}</strong><small>${esc(sp?.latin || '')}</small></span></button>`;
}

function viewSites() {
  const head = `<div class="row"><h1>Sites</h1><button class="primary" data-act="add-site">Add site</button></div>`;
  if (!state.sites.length) return head + emptyState('Sites are the rooms or outdoor spots your plants live in. Light and humidity there shape the schedule.');
  return head + `<ul class="list">${state.sites.map((s) => `<li>
    <button class="linkish" data-act="edit-site" data-id="${s.id}"><strong>${esc(s.name)}</strong>
    <small>${s.outdoor ? 'Outdoor' : 'Indoor'} · ${s.light} light · ${s.humidity} humidity · ${state.plants.filter((p) => p.siteId === s.id).length} plants</small></button></li>`).join('')}</ul>`;
}

function viewTools() {
  return `<h1>Tools</h1>
  <section class="panel"><h2>Light meter</h2>
    <p class="muted">Point your camera from the plant's spot toward the window. Uses the ambient light sensor if your device exposes one; otherwise a rough camera estimate.</p>
    <video id="meterVideo" playsinline muted hidden></video>
    <div id="meterOut" class="meter" aria-live="polite">—</div>
    <button class="primary" data-act="meter">${stopMeter ? 'Stop' : 'Start'} measuring</button>
  </section>
  <section class="panel"><h2>Plant doctor</h2>
    ${state.plants.length ? `<form id="doctorForm">
      <label>Plant <select name="plant">${state.plants.map((p) => `<option value="${p.id}">${esc(plantName(p))}</option>`).join('')}</select></label>
      <label>What do you see? <select name="symptom">${Object.entries(SYMPTOMS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <button class="primary">Check</button></form><div id="doctorOut" aria-live="polite"></div>` : '<p class="muted">Add a plant to use the doctor.</p>'}
  </section>`;
}

function viewSettings() {
  const s = state.settings;
  return `<h1>Settings</h1>
  <section class="panel"><h2>Location &amp; weather</h2>
    <p class="muted">Your location sets the season (hemisphere). With weather on, rounded coordinates are sent to Open-Meteo to adjust outdoor plants for heat and rain.</p>
    <p>${s.lat != null ? `Location: ${s.lat}, ${s.lon}` : 'No location set (assuming northern hemisphere).'}</p>
    <button data-act="locate">Use my location</button>
    <label class="check"><input type="checkbox" data-act="toggle-weather" ${s.useWeather ? 'checked' : ''} ${s.lat == null ? 'disabled' : ''}> Use local weather for outdoor plants</label>
  </section>
  <section class="panel"><h2>Reminders</h2>
    <p class="muted">Shows a daily notification for due tasks when LiraLeaf is opened or running. Background push would need a server.</p>
    <label class="check"><input type="checkbox" data-act="toggle-notify" ${s.notify ? 'checked' : ''}> Notify me about due tasks</label>
  </section>
  <section class="panel"><h2>Backup &amp; sharing</h2>
    <p class="muted">Export a backup file to move to another device, or share it with someone who looks after your plants.</p>
    <button data-act="export">Export backup</button>
    <label class="filebtn">Import backup<input type="file" accept="application/json" data-act="import" hidden></label>
  </section>`;
}

// ---------------- Dialogs ----------------
const dlg = () => $('#dialog');
function openDialog(html, onSubmit) {
  const d = dlg();
  d.innerHTML = `<form method="dialog" class="dform">${html}</form>`;
  const form = $('form', d);
  form.addEventListener('submit', (e) => {
    const btn = e.submitter;
    if (btn?.value === 'cancel') return;
    e.preventDefault();
    if (onSubmit(new FormData(form), btn?.value) !== false) d.close();
  });
  d.showModal();
}

function siteDialog(site) {
  const s = site || { name: '', light: 'medium', humidity: 'normal', outdoor: false };
  openDialog(`<h2>${site ? 'Edit' : 'New'} site</h2>
    <label>Name <input name="name" required value="${esc(s.name)}" placeholder="Living room"></label>
    <label>Light <select name="light">${['low', 'medium', 'bright', 'direct'].map((v) => `<option ${s.light === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <p class="hint">Not sure? Measure it with the light meter under Tools.</p>
    <label>Humidity <select name="humidity">${['low', 'normal', 'high'].map((v) => `<option ${s.humidity === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="outdoor" ${s.outdoor ? 'checked' : ''}> Outdoors</label>
    <div class="actions">${site ? '<button value="delete" class="danger">Delete</button>' : ''}<button value="cancel" formnovalidate>Cancel</button><button class="primary" value="save">Save</button></div>`,
  (fd, action) => {
    if (action === 'delete') {
      if (state.plants.some((p) => p.siteId === site.id)) { toast('Move or remove the plants in this site first.'); return false; }
      state.sites = state.sites.filter((x) => x.id !== site.id);
    } else {
      const data = { name: fd.get('name').trim(), light: fd.get('light'), humidity: fd.get('humidity'), outdoor: fd.get('outdoor') === 'on' };
      if (site) Object.assign(site, data); else state.sites.push({ id: uid(), ...data });
    }
    persist(); render();
  });
}

function plantDialog(plant) {
  const p = plant || { speciesId: SPECIES[0].id, siteId: state.sites[0]?.id, potCm: 14, material: 'plastic', drainage: true, soil: '', planting: 'pot', windowM: 1, lastWatered: new Date().toISOString().slice(0, 10) };
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
  openDialog(`<h2>${plant ? 'Edit' : 'Add'} plant</h2>
    <label>Species <select name="speciesId">${opt(SPECIES.map((s) => [s.id, `${s.name} (${s.latin})`]), p.speciesId)}</select></label>
    <label>Nickname <input name="nickname" value="${esc(p.nickname || '')}" placeholder="Optional"></label>
    <label>Site <select name="siteId">${opt(state.sites.map((s) => [s.id, s.name]), p.siteId)}</select></label>
    <label>Planted in <select name="planting">${opt([['pot', 'A pot'], ['ground', 'The ground']], p.planting)}</select></label>
    <div class="two"><label>Pot size (cm) <input name="potCm" type="number" min="5" max="80" value="${p.potCm}"></label>
    <label>Pot material <select name="material">${opt(['plastic', 'terracotta', 'glazed', 'fabric', 'concrete', 'wood', 'glass', 'metal'].map((m) => [m, m]), p.material)}</select></label></div>
    <div class="two"><label>Soil <select name="soil">${opt([['', 'Species default'], ['standard', 'Standard potting'], ['cactus', 'Cactus/gritty'], ['bark', 'Bark/orchid'], ['peat', 'Peat-rich']], p.soil)}</select></label>
    <label>Distance to window (m) <input name="windowM" type="number" min="0" max="10" step="0.5" value="${p.windowM ?? ''}"></label></div>
    <label class="check"><input type="checkbox" name="drainage" ${p.drainage !== false ? 'checked' : ''}> Pot has a drainage hole</label>
    ${plant ? '' : `<label>Last watered <input name="lastWatered" type="date" value="${p.lastWatered}"></label>`}
    <div class="actions">${plant ? '<button value="delete" class="danger">Remove</button>' : ''}<button value="cancel" formnovalidate>Cancel</button><button class="primary" value="save">Save</button></div>`,
  (fd, action) => {
    if (action === 'delete') { state.plants = state.plants.filter((x) => x.id !== plant.id); persist(); render(); return; }
    const data = { speciesId: fd.get('speciesId'), nickname: fd.get('nickname').trim(), siteId: fd.get('siteId'), planting: fd.get('planting'),
      potCm: Number(fd.get('potCm')) || 14, material: fd.get('material'), soil: fd.get('soil'), windowM: fd.get('windowM') === '' ? null : Number(fd.get('windowM')),
      drainage: fd.get('drainage') === 'on' };
    if (plant) Object.assign(plant, data);
    else state.plants.push({ id: uid(), added: new Date().toISOString(), log: [], snooze: {}, ...data,
      lastWatered: fd.get('lastWatered') ? new Date(fd.get('lastWatered') + 'T12:00').toISOString() : null });
    persist(); render();
  });
}

function plantDetail(id) {
  const p = state.plants.find((x) => x.id === id);
  const sp = byId(p.speciesId), site = siteOf(p) || {};
  const c = ctx();
  const w = wateringInterval(p, sp, site, c);
  const tasks = computeTasks({ ...state, plants: [p] }, c);
  const log = [...(p.log || [])].reverse().slice(0, 30);
  openDialog(`<h2>${esc(plantName(p))}</h2><p class="muted">${esc(sp.latin)} · ${esc(site.name || '')}</p>
    ${p.photo ? `<img class="hero" src="${p.photo}" alt="Photo of ${esc(plantName(p))}">` : ''}
    <h3>Schedule</h3><ul class="sched">${tasks.map((t) => `<li>${ICON[t.type]} ${TASK_LABEL[t.type]} — every ${t.interval} d · ${fmtDue(t)}
      ${(p.log || []).some((e) => e.type === t.type && e.kind !== 'note') ? `<button value="undo:${t.type}" class="small">Undo last</button>` : ''}</li>`).join('')}
      ${TASK_TYPES.filter((t) => !tasks.some((x) => x.type === t)).map((t) => `<li class="muted">${ICON[t]} ${TASK_LABEL[t]} — paused/not needed</li>`).join('')}</ul>
    <details><summary>Why every ${w.days} days of water?</summary>
      <p>Base for ${esc(sp.name)}: ${w.base} days</p><ul>${w.factors.map((f) => `<li>${esc(f.label)}: ×${f.factor.toFixed(2)}</li>`).join('') || '<li>No adjustments</li>'}</ul></details>
    <h3>Journal</h3>
    <label>Add a note <textarea name="note" rows="2" placeholder="New leaf unfurled…"></textarea></label>
    <label class="filebtn">Add / replace photo<input type="file" accept="image/*" capture="environment" name="photo" hidden></label>
    <ul class="log">${log.map((e) => `<li><time>${new Date(e.at).toLocaleDateString()}</time> ${e.kind === 'note' ? esc(e.text) : `${ICON[e.type] || ''} ${TASK_LABEL[e.type] || e.type}${e.kind === 'skip' ? ' (skipped)' : ''}`}</li>`).join('') || '<li class="muted">No history yet.</li>'}</ul>
    <div class="actions"><button value="edit">Edit plant</button><button value="cancel" formnovalidate>Close</button><button class="primary" value="note">Save note</button></div>`,
  (fd, action) => {
    if (action === 'edit') { setTimeout(() => plantDialog(p)); return; }
    if (action?.startsWith('undo:')) { updatePlant(p.id, (x) => undoLast(x, action.slice(5))); setTimeout(() => plantDetail(p.id)); return; }
    const text = (fd.get('note') || '').trim();
    if (text) updatePlant(p.id, (x) => ({ ...x, log: [...(x.log || []), { kind: 'note', type: 'note', text, at: new Date().toISOString() }] }));
  });
  $('input[name=photo]', dlg()).addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const photo = await shrink(f, 480);
    updatePlant(p.id, (x) => ({ ...x, photo }));
    dlg().close(); plantDetail(p.id);
  });
}

function shrink(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject; img.src = URL.createObjectURL(file);
  });
}

// ---------------- Events ----------------
document.addEventListener('click', async (e) => {
  const nav = e.target.closest('nav button');
  if (nav) { view = nav.dataset.view; render(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const { act, id, type } = el.dataset;
  if (act === 'add-site') siteDialog();
  if (act === 'edit-site') siteDialog(state.sites.find((s) => s.id === id));
  if (act === 'add-plant') plantDialog();
  if (act === 'open-plant') plantDetail(id);
  if (act === 'done') { updatePlant(id, (p) => completeTask(p, type)); toast(`${TASK_LABEL[type]} logged.`); }
  if (act === 'skip') updatePlant(id, (p) => skipTask(p, type));
  if (act === 'snooze') updatePlant(id, (p) => snoozeTask(p, type, 1));
  if (act === 'export') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(exportJson(state));
    a.download = `liraleaf-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  if (act === 'locate') {
    try { const loc = await locate(); state.settings.lat = loc.lat; state.settings.lon = loc.lon; persist(); render(); refreshWeather(); }
    catch (err) { toast('Could not get location: ' + err.message); }
  }
  if (act === 'meter') {
    if (stopMeter) { stopMeter(); stopMeter = null; render(); return; }
    const out = $('#meterOut');
    try {
      stopMeter = await startLightMeter($('#meterVideo'), (r) => { out.innerHTML = `<strong>${r.level}</strong> light<small>${r.source === 'sensor' ? `${r.lux} lux` : `≈${r.lux} lux (camera estimate)`}</small>`; });
      el.textContent = 'Stop measuring';
    } catch (err) { out.textContent = 'Camera unavailable: ' + err.message; }
  }
});

document.addEventListener('change', async (e) => {
  const act = e.target.dataset.act;
  if (act === 'toggle-weather') { state.settings.useWeather = e.target.checked; persist(); await refreshWeather(); render(); }
  if (act === 'toggle-notify') {
    if (e.target.checked && 'Notification' in window && (await Notification.requestPermission()) !== 'granted') { e.target.checked = false; toast('Notifications were not allowed.'); return; }
    state.settings.notify = e.target.checked; persist(); checkNotify();
  }
  if (act === 'import') {
    try { state = importJson(await e.target.files[0].text()); persist(); render(); toast('Backup imported.'); }
    catch (err) { toast('Import failed: ' + err.message); }
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'doctorForm') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const p = state.plants.find((x) => x.id === fd.get('plant'));
  const res = diagnose(fd.get('symptom'), p, byId(p.speciesId), siteOf(p));
  $('#doctorOut').innerHTML = `<ol class="dx">${res.map((r, i) => `<li><strong>${i === 0 ? 'Most likely: ' : ''}${r.cause}</strong><br>${r.fix}</li>`).join('')}</ol>
    <p class="hint">Rules-based guidance, not a lab diagnosis.</p>`;
});

async function refreshWeather() {
  const s = state.settings;
  if (!s.useWeather || s.lat == null) { weather = null; return; }
  try { weather = await getWeather(s.lat, s.lon); } catch { weather = null; toast('Weather unavailable; using defaults.'); }
}

async function checkNotify() {
  const s = state.settings;
  if (!s.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const todayKey = new Date().toISOString().slice(0, 10);
  if (s.lastNotified === todayKey) return;
  const due = computeTasks(state, ctx()).filter((t) => t.due <= startOfDay(new Date()));
  if (!due.length) return;
  const body = due.slice(0, 4).map((t) => `${TASK_LABEL[t.type]} ${plantName(state.plants.find((p) => p.id === t.plantId))}`).join(', ') + (due.length > 4 ? '…' : '');
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(`${due.length} plant task${due.length > 1 ? 's' : ''} due`, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'liraleaf-daily' });
  else new Notification(`${due.length} plant tasks due`, { body });
  s.lastNotified = todayKey; persist();
}

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  // When an updated version takes over, reload once so the new code runs.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
}
refreshWeather().then(render);
render();
checkNotify();
setInterval(checkNotify, 30 * 60 * 1000);
