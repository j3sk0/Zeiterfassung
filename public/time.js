export const pad = (n) => String(n).padStart(2, '0');

// Arbeitszeit in Sekunden: Ende (oder jetzt) minus Start minus Pausen, inkl. einer gerade laufenden Pause.
export function workSeconds(e, now = new Date()) {
  const end = e.end_at ? new Date(e.end_at) : now;
  const pausing = e.paused_at ? (end - new Date(e.paused_at)) / 1000 : 0;
  return Math.max(0, Math.floor((end - new Date(e.start_at)) / 1000 - (e.pause_seconds || 0) - pausing));
}

// Jeder angefangene 15-Minuten-Block zählt: 1:10 h -> 1,25 h, 1:00 h -> 1,00 h.
export const roundedHours = (minutes) => (Math.ceil(minutes / 15) * 15) / 60;

// Sekunden zählen nicht als angefangene Minute.
export const entryHours = (e) => (e.end_at ? roundedHours(Math.floor(workSeconds(e) / 60)) : 0);

export const fmtHours = (h) =>
  h.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' h';

// Lokales Datum als YYYY-MM-DD (nicht UTC).
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
