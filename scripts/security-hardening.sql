-- RELIGIOUS Supabase security hardening.
-- Production-safe and idempotent.
-- Every table-specific ALTER TABLE, DROP POLICY and CREATE POLICY is guarded
-- by to_regclass(...) so this can run on fresh and existing databases.

begin;

do $$
begin
  if to_regclass('public.religions') is not null then
    execute 'alter table public.religions enable row level security';
    execute 'drop policy if exists "Public can read religions" on public.religions';
    execute 'create policy "Public can read religions" on public.religions for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.prayers') is not null then
    execute 'alter table public.prayers enable row level security';
    execute 'drop policy if exists "Public can read prayers" on public.prayers';
    execute 'create policy "Public can read prayers" on public.prayers for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.holy_books') is not null then
    execute 'alter table public.holy_books enable row level security';
    execute 'drop policy if exists "Public can read holy books" on public.holy_books';
    execute 'create policy "Public can read holy books" on public.holy_books for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.chapters') is not null then
    execute 'alter table public.chapters enable row level security';
    execute 'drop policy if exists "Public can read chapters" on public.chapters';
    execute 'create policy "Public can read chapters" on public.chapters for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.verses') is not null then
    execute 'alter table public.verses enable row level security';
    execute 'drop policy if exists "Public can read verses" on public.verses';
    execute 'create policy "Public can read verses" on public.verses for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.temples') is not null then
    execute 'alter table public.temples enable row level security';
    execute 'drop policy if exists "Public can read temples" on public.temples';
    execute 'create policy "Public can read temples" on public.temples for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.religious_events') is not null then
    execute 'alter table public.religious_events enable row level security';
    execute 'drop policy if exists "Public can read religious events" on public.religious_events';
    execute 'create policy "Public can read religious events" on public.religious_events for select to anon, authenticated using (true)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.favorites') is not null then
    execute 'alter table public.favorites enable row level security';
    execute 'drop policy if exists "Users can read their own favorites" on public.favorites';
    execute 'drop policy if exists "Users can insert their own favorites" on public.favorites';
    execute 'drop policy if exists "Users can update their own favorites" on public.favorites';
    execute 'drop policy if exists "Users can delete their own favorites" on public.favorites';
    execute 'create policy "Users can read their own favorites" on public.favorites for select to authenticated using (user_id = auth.uid())';
    execute 'create policy "Users can insert their own favorites" on public.favorites for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "Users can update their own favorites" on public.favorites for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Users can delete their own favorites" on public.favorites for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.favorite_verses') is not null then
    execute 'alter table public.favorite_verses enable row level security';
    execute 'drop policy if exists "Users can read their own favorite verses" on public.favorite_verses';
    execute 'drop policy if exists "Users can insert their own favorite verses" on public.favorite_verses';
    execute 'drop policy if exists "Users can update their own favorite verses" on public.favorite_verses';
    execute 'drop policy if exists "Users can delete their own favorite verses" on public.favorite_verses';
    execute 'create policy "Users can read their own favorite verses" on public.favorite_verses for select to authenticated using (user_id = auth.uid())';
    execute 'create policy "Users can insert their own favorite verses" on public.favorite_verses for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "Users can update their own favorite verses" on public.favorite_verses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Users can delete their own favorite verses" on public.favorite_verses for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.reminders') is not null then
    execute 'alter table public.reminders enable row level security';
    execute 'drop policy if exists "Users can read their own reminders" on public.reminders';
    execute 'drop policy if exists "Users can insert their own reminders" on public.reminders';
    execute 'drop policy if exists "Users can update their own reminders" on public.reminders';
    execute 'drop policy if exists "Users can delete their own reminders" on public.reminders';
    execute 'create policy "Users can read their own reminders" on public.reminders for select to authenticated using (user_id = auth.uid())';
    execute 'create policy "Users can insert their own reminders" on public.reminders for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "Users can update their own reminders" on public.reminders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Users can delete their own reminders" on public.reminders for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';
    execute 'drop policy if exists "Users can read their own profile" on public.profiles';
    execute 'drop policy if exists "Users can insert their own profile" on public.profiles';
    execute 'drop policy if exists "Users can update their own profile" on public.profiles';
    execute 'drop policy if exists "Users can delete their own profile" on public.profiles';
    execute 'create policy "Users can read their own profile" on public.profiles for select to authenticated using (id = auth.uid())';
    execute 'create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (id = auth.uid())';
    execute 'create policy "Users can update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid())';
    execute 'create policy "Users can delete their own profile" on public.profiles for delete to authenticated using (id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.temple_photos') is not null then
    execute 'alter table public.temple_photos add column if not exists user_id uuid references auth.users(id) on delete set null';
    execute 'alter table public.temple_photos add column if not exists is_approved boolean not null default true';
    execute 'create index if not exists temple_photos_user_id_idx on public.temple_photos (user_id)';
    execute 'alter table public.temple_photos enable row level security';
    execute 'drop policy if exists "Public can read approved temple photos" on public.temple_photos';
    execute 'drop policy if exists "Users can insert their own temple photos" on public.temple_photos';
    execute 'drop policy if exists "Users can update their own temple photos" on public.temple_photos';
    execute 'drop policy if exists "Users can delete their own temple photos" on public.temple_photos';
    execute 'create policy "Public can read approved temple photos" on public.temple_photos for select to anon, authenticated using (is_approved = true)';
    execute 'create policy "Users can insert their own temple photos" on public.temple_photos for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "Users can update their own temple photos" on public.temple_photos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Users can delete their own temple photos" on public.temple_photos for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.temple_reviews') is not null then
    execute 'alter table public.temple_reviews add column if not exists user_id uuid references auth.users(id) on delete set null';
    execute 'alter table public.temple_reviews add column if not exists is_approved boolean not null default true';
    execute 'create index if not exists temple_reviews_user_id_idx on public.temple_reviews (user_id)';
    execute 'alter table public.temple_reviews enable row level security';
    execute 'drop policy if exists "Public can read approved temple reviews" on public.temple_reviews';
    execute 'drop policy if exists "Users can insert their own temple reviews" on public.temple_reviews';
    execute 'drop policy if exists "Users can update their own temple reviews" on public.temple_reviews';
    execute 'drop policy if exists "Users can delete their own temple reviews" on public.temple_reviews';
    execute 'create policy "Public can read approved temple reviews" on public.temple_reviews for select to anon, authenticated using (is_approved = true)';
    execute 'create policy "Users can insert their own temple reviews" on public.temple_reviews for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "Users can update their own temple reviews" on public.temple_reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy "Users can delete their own temple reviews" on public.temple_reviews for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.osm_import_progress') is not null then
    execute 'alter table public.osm_import_progress enable row level security';
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Public can read temple photo files" on storage.objects';
    execute 'drop policy if exists "Authenticated users can upload temple photo files" on storage.objects';
    execute 'drop policy if exists "Users can update their own temple photo files" on storage.objects';
    execute 'drop policy if exists "Users can delete their own temple photo files" on storage.objects';
    execute 'create policy "Public can read temple photo files" on storage.objects for select to anon, authenticated using (bucket_id = ''temple-photos'')';
    execute 'create policy "Authenticated users can upload temple photo files" on storage.objects for insert to authenticated with check (bucket_id = ''temple-photos'' and owner = auth.uid())';
    execute 'create policy "Users can update their own temple photo files" on storage.objects for update to authenticated using (bucket_id = ''temple-photos'' and owner = auth.uid()) with check (bucket_id = ''temple-photos'' and owner = auth.uid())';
    execute 'create policy "Users can delete their own temple photo files" on storage.objects for delete to authenticated using (bucket_id = ''temple-photos'' and owner = auth.uid())';
  end if;
end $$;

commit;
