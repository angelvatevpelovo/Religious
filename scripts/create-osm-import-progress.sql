create table if not exists osm_import_progress (
  country_code text primary key,
  country_name text not null,
  status text not null default 'pending',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_run_at timestamp with time zone default now(),
  last_error text,
  fetched integer not null default 0,
  candidates integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  errors integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists osm_import_progress_status_idx
on osm_import_progress (status);
