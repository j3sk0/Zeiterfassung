import { entryHours, workSeconds, fmtHours, dateKey, timeStr, pad } from './time.js';
import { createStore } from './store.js';

const $ = (s) => document.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LAST_PROJECT = 'zt-last-project';
const GEO = 'zt-geo';

let store;
let projects = [];
let running = null;
let month = firstOfMonth(new Date());
let editing = null;
let timer;
const shown = new Map(); // id -> Eintrag, für Klick auf Liste

function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
const projectName = (id) => projects.find((p) => p.id === id)?.name || 'Ohne Projekt';
const sum = (list) => list.reduce((a, e) => a + entryHours(e), 0);
function group(list, key) {
  const m = new Map();
  for (const e of list) { const k = key(e); m.has(k) ? m.get(k).push(e) : m.set(k, [e]); }
  return m;
}

async function guard(fn) {
  try { await fn(); } catch (err) { console.error(err); alert('Fehler: ' + (err.message || err)); }
}

// ---------- Laden ----------
async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  store = await createStore();
  if (store.kind === 'supabase') {
    const { data } = await store.sb.auth.getSession();
    if (!data.session) { $('#login').hidden = false; return; }
    $('#logout').hidden = false;
  } else {
    $('#local-hint').hidden = false;
  }
  showApp();
}

async function showApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  await refresh();
}

async function refresh() {
  projects = await store.projects();
  running = await store.running();
  renderTrack();
  renderProjects();
  await Promise.all([renderToday(), renderMonth()]);
}

// ---------- Erfassen ----------
function fillProjectSelect(sel, selected) {
  const list = projects.filter((p) => !p.archived || p.id === selected);
  sel.innerHTML = '<option value="">Ohne Projekt</option>' +
    list.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  sel.value = list.some((p) => p.id === selected) ? selected : '';
}

function renderTrack() {
  clearInterval(timer);
  $('#idle').hidden = !!running;
  $('#running').hidden = !running;
  $('#geo').checked = localStorage.getItem(GEO) === '1';
  if (!running) return fillProjectSelect($('#start-project'), localStorage.getItem(LAST_PROJECT));
  $('#run-project').textContent = projectName(running.project_id);
  $('#run-since').textContent = running.paused_at ? 'Pause seit ' + timeStr(new Date(running.paused_at))
    : 'seit ' + timeStr(new Date(running.start_at));
  $('#pause').textContent = running.paused_at ? '▶ Weiter' : '❚❚ Pause';
  $('#running').classList.toggle('paused', !!running.paused_at);
  if (document.activeElement !== $('#run-note')) $('#run-note').value = running.note || '';
  const tick = () => {
    const s = workSeconds(running);
    $('#run-clock').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  };
  tick();
  timer = setInterval(tick, 1000);
}

function locate() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

$('#start').onclick = () => guard(async () => {
  running = await store.running(); // evtl. schon auf anderem Gerät gestartet
  if (running) return refresh();
  const e = {
    id: crypto.randomUUID(),
    project_id: $('#start-project').value || null,
    start_at: new Date().toISOString(),
    end_at: null,
    note: $('#start-note').value.trim(),
    lat: null,
    lng: null,
  };
  await store.insert('entries', e);
  localStorage.setItem(LAST_PROJECT, e.project_id || '');
  $('#start-note').value = '';
  await refresh();
  if ($('#geo').checked) {
    const pos = await locate();
    if (pos) await store.update('entries', e.id, pos);
  }
});

// Laufende Pause in pause_seconds übernehmen, damit Weiter/Stopp sie mitzählt.
const endPause = (now) => (running.paused_at
  ? { paused_at: null, pause_seconds: (running.pause_seconds || 0) + Math.round((now - new Date(running.paused_at)) / 1000) }
  : {});

$('#pause').onclick = () => guard(async () => {
  const now = new Date();
  await store.update('entries', running.id, running.paused_at ? endPause(now) : { paused_at: now.toISOString() });
  await refresh();
});

$('#stop').onclick = () => guard(async () => {
  const now = new Date();
  await store.update('entries', running.id, { ...endPause(now), end_at: now.toISOString(), note: $('#run-note').value.trim() });
  await refresh();
});

$('#run-note').onchange = () => guard(() => store.update('entries', running.id, { note: $('#run-note').value.trim() }));
$('#geo').onchange = (ev) => localStorage.setItem(GEO, ev.target.checked ? '1' : '0');

// ---------- Listen ----------
function entryRow(e) {
  shown.set(e.id, e);
  const s = new Date(e.start_at);
  return `<li><button class="entry" data-id="${e.id}">
    <span class="time">${timeStr(s)}–${e.end_at ? timeStr(new Date(e.end_at)) : 'läuft'}</span>
    <span class="proj">${esc(projectName(e.project_id))}</span>
    <span class="hours">${e.end_at ? fmtHours(entryHours(e)) : ''}${e.lat != null ? ' 📍' : ''}</span>
    ${e.note || e.pause_seconds ? `<span class="note">${[e.pause_seconds ? `Pause ${Math.round(e.pause_seconds / 60)} min` : '', esc(e.note)].filter(Boolean).join(' · ')}</span>` : ''}
  </button></li>`;
}

async function renderToday() {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + 1);
  const list = await store.entries(from.toISOString(), to.toISOString());
  $('#today-total').textContent = fmtHours(sum(list));
  $('#today').innerHTML = list.map(entryRow).join('') || '<li class="empty">Noch nichts erfasst.</li>';
}

async function renderMonth() {
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  $('#month-label').textContent = month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const list = await store.entries(month.toISOString(), to.toISOString());
  $('#month-total').textContent = fmtHours(sum(list));
  $('#month-projects').innerHTML = [...group(list, (e) => projectName(e.project_id))]
    .map(([name, es]) => `<li><span>${esc(name)}</span><span>${fmtHours(sum(es))}</span></li>`).join('');
  $('#month-days').innerHTML = [...group(list, (e) => dateKey(new Date(e.start_at)))].reverse()
    .map(([day, es]) => {
      const label = new Date(day + 'T00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return `<section class="day"><h3><span>${label}</span><span>${fmtHours(sum(es))}</span></h3>
        <ul class="entries">${es.map(entryRow).join('')}</ul></section>`;
    }).join('') || '<p class="empty">Keine Einträge in diesem Monat.</p>';
}

$('#prev-month').onclick = () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); guard(renderMonth); };
$('#next-month').onclick = () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); guard(renderMonth); };

// ---------- Excel-Export ----------
function loadScript(src) {
  return new Promise((res, rej) => {
    const el = Object.assign(document.createElement('script'), { src, onload: res });
    el.onerror = () => rej(new Error('Excel-Export konnte nicht geladen werden.'));
    document.head.append(el);
  });
}

$('#export').onclick = () => guard(async () => {
  if (!window.XLSX) await loadScript('vendor/xlsx.mini.min.js'); // SheetJS 0.18.5, nur beim Export geladen
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const list = (await store.entries(month.toISOString(), to.toISOString())).filter((e) => e.end_at);
  const times = [['Datum', 'Von', 'Bis', 'Pause (min)', 'Projekt', 'Aufgabe', 'Stunden'],
    ...list.map((e) => {
      const s = new Date(e.start_at);
      return [s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), timeStr(s), timeStr(new Date(e.end_at)),
        Math.round((e.pause_seconds || 0) / 60), projectName(e.project_id), e.note || '', entryHours(e)];
    }),
    [], ['Gesamt', '', '', '', '', '', sum(list)]];
  const perProject = [['Projekt', 'Stunden'],
    ...[...group(list, (e) => projectName(e.project_id))].map(([name, es]) => [name, sum(es)]),
    ['Gesamt', sum(list)]];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(times);
  ws['!cols'] = [11, 6, 6, 11, 22, 45, 9].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, 'Zeiten');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perProject), 'Projekte');
  XLSX.writeFile(wb, `Zeiterfassung_${month.getFullYear()}-${pad(month.getMonth() + 1)}.xlsx`);
});

// ---------- Eintrag bearbeiten / nachtragen ----------
const dlg = $('#entry-dialog');
const form = dlg.querySelector('form');

function openEntry(e) {
  editing = e;
  const s = e ? new Date(e.start_at) : new Date();
  $('#entry-title').textContent = e ? 'Eintrag bearbeiten' : 'Zeit nachtragen';
  fillProjectSelect(form.project, e ? e.project_id : localStorage.getItem(LAST_PROJECT));
  form.date.value = dateKey(s);
  form.from.value = e ? timeStr(s) : '';
  form.to.value = e?.end_at ? timeStr(new Date(e.end_at)) : '';
  form.to.required = !(e && !e.end_at); // nur eine laufende Zeit darf ohne Ende bleiben
  form.pause.value = e?.pause_seconds ? Math.round(e.pause_seconds / 60) : '';
  form.note.value = e?.note || '';
  $('#entry-geo').innerHTML = e?.lat != null
    ? `<a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" rel="noopener">📍 Standort beim Start anzeigen</a>` : '';
  $('#entry-delete').hidden = !e;
  dlg.showModal();
}

form.onsubmit = (ev) => {
  ev.preventDefault();
  guard(async () => {
    const start = new Date(`${form.date.value}T${form.from.value}`);
    const end = form.to.value ? new Date(`${form.date.value}T${form.to.value}`) : null;
    if (end && end < start) end.setDate(end.getDate() + 1); // über Mitternacht
    const row = {
      project_id: form.project.value || null,
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      pause_seconds: (Number(form.pause.value) || 0) * 60,
      note: form.note.value.trim(),
    };
    if (editing) await store.update('entries', editing.id, row);
    else await store.insert('entries', { id: crypto.randomUUID(), lat: null, lng: null, ...row });
    dlg.close();
    await refresh();
  });
};

$('#entry-delete').onclick = () => guard(async () => {
  if (!confirm('Eintrag wirklich löschen?')) return;
  await store.remove('entries', editing.id);
  dlg.close();
  await refresh();
});
$('#entry-cancel').onclick = () => dlg.close();
document.querySelectorAll('.add-entry').forEach((b) => (b.onclick = () => openEntry(null)));
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.entry');
  if (b) openEntry(shown.get(b.dataset.id));
});

// ---------- Projekte ----------
function renderProjects() {
  $('#project-list').innerHTML = projects.map((p) => `<li class="${p.archived ? 'archived' : ''}">
    <span>${esc(p.name)}</span>
    <button data-rename="${p.id}">Umbenennen</button>
    <button data-archive="${p.id}">${p.archived ? 'Aktivieren' : 'Archivieren'}</button>
  </li>`).join('') || '<li class="empty">Noch keine Projekte angelegt.</li>';
}

$('#project-form').onsubmit = (ev) => {
  ev.preventDefault();
  guard(async () => {
    const name = ev.target.name.value.trim();
    if (!name) return;
    await store.insert('projects', { id: crypto.randomUUID(), name, archived: false });
    ev.target.reset();
    await refresh();
  });
};

$('#project-list').onclick = (ev) => guard(async () => {
  const { rename, archive } = ev.target.dataset;
  if (rename) {
    const name = prompt('Neuer Name:', projectName(rename))?.trim();
    if (name) await store.update('projects', rename, { name });
  } else if (archive) {
    const p = projects.find((x) => x.id === archive);
    await store.update('projects', archive, { archived: !p.archived });
  } else return;
  await refresh();
});

// ---------- Navigation, Login ----------
document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== 'view-' + b.dataset.view));
}));

$('#login-form').onsubmit = (ev) => {
  ev.preventDefault();
  guard(async () => {
    const creds = { email: ev.target.email.value, password: ev.target.password.value };
    const auth = store.sb.auth;
    const { error } = ev.submitter?.value === 'signup' ? await auth.signUp(creds) : await auth.signInWithPassword(creds);
    if (error) throw error;
    const { data } = await auth.getSession();
    if (!data.session) return alert('Bitte bestätige die E-Mail und melde dich danach an.');
    $('#logout').hidden = false;
    await showApp();
  });
};
$('#logout').onclick = () => guard(async () => { await store.sb.auth.signOut(); location.reload(); });

// Beim Zurückkehren zur App neu laden, damit Änderungen vom anderen Gerät sichtbar sind.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !$('#app').hidden && !dlg.open) guard(refresh);
});

guard(init);
