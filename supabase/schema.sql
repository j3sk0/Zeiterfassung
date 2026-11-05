-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references projects on delete set null,
  start_at timestamptz not null,
  end_at timestamptz,
  note text not null default '',
  pause_seconds integer not null default 0 check (pause_seconds >= 0),
  paused_at timestamptz,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  check (end_at is null or end_at >= start_at)
);

create index entries_user_start on entries (user_id, start_at);
-- Höchstens eine laufende Zeit pro Person, auch wenn Handy und PC gleichzeitig starten.
create unique index entries_one_running on entries (user_id) where end_at is null;

alter table projects enable row level security;
alter table entries enable row level security;
create policy "eigene Projekte" on projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eigene Einträge" on entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
