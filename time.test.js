import test from 'node:test';
import assert from 'node:assert/strict';
import { roundedHours, minutesBetween, entryHours } from './public/time.js';

test('rundet auf angefangene Viertelstunden auf', () => {
  assert.equal(roundedHours(0), 0);
  assert.equal(roundedHours(1), 0.25);
  assert.equal(roundedHours(15), 0.25);
  assert.equal(roundedHours(60), 1);
  assert.equal(roundedHours(70), 1.25); // 1h10 -> 1,25 h
  assert.equal(roundedHours(76), 1.5);
});

test('Sekunden zählen nicht als angefangene Minute', () => {
  assert.equal(minutesBetween('2026-11-05T08:00:00Z', '2026-11-05T09:00:40Z'), 60);
  assert.equal(entryHours({ start_at: '2026-11-05T08:00:00Z', end_at: '2026-11-05T09:00:40Z' }), 1);
});

test('laufender Eintrag zählt noch nicht', () => {
  assert.equal(entryHours({ start_at: '2026-11-05T08:00:00Z', end_at: null }), 0);
});
