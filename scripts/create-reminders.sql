create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  reminder_type text not null check (reminder_type in ('prayer', 'event', 'custom')),
  reminder_time timestamp with time zone not null,
  is_completed boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists reminders_user_time_idx
  on public.reminders (user_id, reminder_time);

alter table public.reminders enable row level security;

create policy "Users can read their own reminders"
  on public.reminders
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own reminders"
  on public.reminders
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reminders"
  on public.reminders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own reminders"
  on public.reminders
  for delete
  using (auth.uid() = user_id);
