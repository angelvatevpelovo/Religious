create extension if not exists pgcrypto;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  reminder_time timestamp with time zone not null,
  frequency text not null default 'once',
  created_at timestamp with time zone default now()
);

alter table public.reminders
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists reminder_time timestamp with time zone,
  add column if not exists frequency text default 'once',
  add column if not exists created_at timestamp with time zone default now();

alter table public.reminders
  alter column id set default gen_random_uuid(),
  alter column frequency set default 'once',
  alter column created_at set default now();

update public.reminders
set
  id = coalesce(id, gen_random_uuid()),
  title = coalesce(nullif(title, ''), 'Reminder'),
  frequency = coalesce(nullif(frequency, ''), 'once'),
  created_at = coalesce(created_at, now())
where id is null
  or title is null
  or title = ''
  or frequency is null
  or frequency = ''
  or created_at is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reminders'
      and column_name = 'reminder_type'
  ) then
    alter table public.reminders
      alter column reminder_type set default 'custom';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reminders_frequency_check'
      and conrelid = 'public.reminders'::regclass
  ) then
    alter table public.reminders
      add constraint reminders_frequency_check
      check (frequency in ('once', 'daily', 'weekly', 'monthly'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from public.reminders
    where id is null
      or user_id is null
      or title is null
      or title = ''
      or reminder_time is null
      or frequency is null
      or frequency = ''
      or created_at is null
  ) then
    alter table public.reminders
      alter column id set not null,
      alter column user_id set not null,
      alter column title set not null,
      alter column reminder_time set not null,
      alter column frequency set not null,
      alter column created_at set not null;
  end if;
end $$;

create index if not exists reminders_user_time_idx
  on public.reminders (user_id, reminder_time);

alter table public.reminders enable row level security;

drop policy if exists "Users can read their own reminders" on public.reminders;
create policy "Users can read their own reminders"
  on public.reminders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own reminders" on public.reminders;
create policy "Users can create their own reminders"
  on public.reminders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reminders" on public.reminders;
create policy "Users can update their own reminders"
  on public.reminders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own reminders" on public.reminders;
create policy "Users can delete their own reminders"
  on public.reminders
  for delete
  to authenticated
  using (auth.uid() = user_id);
grant select, insert, update, delete on public.reminders to authenticated;