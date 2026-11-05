import test from 'node:test';
import assert from 'node:assert/strict';
import { roundedHours, workSeconds, entryHours } from './public/time.js';

test('rundet auf angefangene Viertelstunden auf', () => {
  assert.equal(roundedHours(0), 0);
  assert.equal(roundedHours(1), 0.25);
  assert.equal(roundedHours(15), 0.25);
  assert.equal(roundedHours(60), 1);
  assert.equal(roundedHours(70), 1.25); // 1h10 -> 1,25 h
  assert.equal(roundedHours(76), 1.5);
});

test('Sekunden zählen nicht als angefangene Minute', () => {
  assert.equal(entryHours({ start_at: '2026-11-05T08:00:00Z', end_at: '2026-11-05T09:00:40Z' }), 1);
});

test('laufender Eintrag zählt noch nicht', () => {
  assert.equal(entryHours({ start_at: '2026-11-05T08:00:00Z', end_at: null }), 0);
});

test('Pause wird vor dem Runden abgezogen', () => {
  // 08:00–12:10 mit 30 min Pause = 3:40 h -> 3,75 h
  assert.equal(entryHours({ start_at: '2026-11-05T08:00:00Z', end_at: '2026-11-05T12:10:00Z', pause_seconds: 1800 }), 3.75);
});

test('laufende Pause hält die Uhr an', () => {
  const e = { start_at: '2026-11-05T08:00:00Z', end_at: null, pause_seconds: 600, paused_at: '2026-11-05T09:00:00Z' };
  assert.equal(workSeconds(e, new Date('2026-11-05T09:20:00Z')), 50 * 60);
});
