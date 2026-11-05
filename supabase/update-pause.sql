-- Nur für Datenbanken, die schema.sql schon vor der Pause-Funktion ausgeführt haben.
alter table entries
  add column if not exists pause_seconds integer not null default 0 check (pause_seconds >= 0),
  add column if not exists paused_at timestamptz;
