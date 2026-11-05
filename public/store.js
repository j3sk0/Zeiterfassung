import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Gleiche Schnittstelle für lokal (localStorage) und Supabase.
export async function createStore() {
  return SUPABASE_URL && SUPABASE_ANON_KEY ? supabaseStore() : localStore();
}

function localStore() {
  const KEY = 'zeiterfassung-v1';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { projects: [], entries: [] }; }
    catch { return { projects: [], entries: [] }; }
  };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const write = (fn) => { const d = load(); fn(d); save(d); };
  return {
    kind: 'local',
    async projects() { return load().projects.sort((a, b) => a.name.localeCompare(b.name, 'de')); },
    // ISO-Strings in UTC lassen sich direkt als Text vergleichen.
    async entries(from, to) {
      return load().entries.filter((e) => e.start_at >= from && e.start_at < to)
        .sort((a, b) => a.start_at.localeCompare(b.start_at));
    },
    async running() { return load().entries.find((e) => !e.end_at) || null; },
    async insert(table, row) { write((d) => d[table].push(row)); },
    async update(table, id, patch) { write((d) => { const r = d[table].find((x) => x.id === id); if (r) Object.assign(r, patch); }); },
    async remove(table, id) { write((d) => { d[table] = d[table].filter((x) => x.id !== id); }); },
  };
}

async function supabaseStore() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.75.0/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    kind: 'supabase',
    sb,
    async projects() { return ok(await sb.from('projects').select('*').order('name')); },
    async entries(from, to) {
      return ok(await sb.from('entries').select('*').gte('start_at', from).lt('start_at', to).order('start_at'));
    },
    async running() { return ok(await sb.from('entries').select('*').is('end_at', null).limit(1))[0] || null; },
    async insert(table, row) { ok(await sb.from(table).insert(row)); },
    async update(table, id, patch) { ok(await sb.from(table).update(patch).eq('id', id)); },
    async remove(table, id) { ok(await sb.from(table).delete().eq('id', id)); },
  };
}
