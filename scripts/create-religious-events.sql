create table if not exists religious_events (
  id uuid primary key default gen_random_uuid(),
  religion text,
  title text not null,
  description text,
  event_date date not null,
  country text,
  is_global boolean default true,
  created_at timestamp with time zone default now()
);
