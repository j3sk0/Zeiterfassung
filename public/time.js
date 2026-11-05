export const pad = (n) => String(n).padStart(2, '0');

// Volle Minuten zwischen zwei Zeitpunkten (Sekunden werden ignoriert).
export const minutesBetween = (a, b) => Math.max(0, Math.floor((new Date(b) - new Date(a)) / 60000));

// Jeder angefangene 15-Minuten-Block zählt: 1:10 h -> 1,25 h, 1:00 h -> 1,00 h.
export const roundedHours = (minutes) => (Math.ceil(minutes / 15) * 15) / 60;

export const entryHours = (e) => (e.end_at ? roundedHours(minutesBetween(e.start_at, e.end_at)) : 0);

export const fmtHours = (h) =>
  h.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' h';

// Lokales Datum als YYYY-MM-DD (nicht UTC).
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
