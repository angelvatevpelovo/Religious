-- RELIGIOUS Supabase security hardening.
-- Run this in the Supabase SQL Editor after confirming the listed tables exist.
-- This script enables RLS and replaces app policies with least-privilege rules.

begin;

-- =========================================================
-- Public catalog tables
-- Public users can read catalog data. No public writes are granted.
-- =========================================================

alter table public.religions enable row level security;
drop policy if exists "Public can read religions" on public.religions;
create policy "Public can read religions"
  on public.religions
  for select
  to anon, authenticated
  using (true);

alter table public.prayers enable row level security;
drop policy if exists "Public can read prayers" on public.prayers;
create policy "Public can read prayers"
  on public.prayers
  for select
  to anon, authenticated
  using (true);

alter table public.holy_books enable row level security;
drop policy if exists "Public can read holy books" on public.holy_books;
create policy "Public can read holy books"
  on public.holy_books
  for select
  to anon, authenticated
  using (true);

alter table public.chapters enable row level security;
drop policy if exists "Public can read chapters" on public.chapters;
create policy "Public can read chapters"
  on public.chapters
  for select
  to anon, authenticated
  using (true);

alter table public.verses enable row level security;
drop policy if exists "Public can read verses" on public.verses;
create policy "Public can read verses"
  on public.verses
  for select
  to anon, authenticated
  using (true);

alter table public.temples enable row level security;
drop policy if exists "Public can read temples" on public.temples;
create policy "Public can read temples"
  on public.temples
  for select
  to anon, authenticated
  using (true);

-- The app uses religious_events as a public calendar catalog.
-- Keep this public read policy if /calendar should work for logged-out users.
-- Remove this policy if religious events should become authenticated-only.
alter table public.religious_events enable row level security;
drop policy if exists "Public can read religious events" on public.religious_events;
create policy "Public can read religious events"
  on public.religious_events
  for select
  to anon, authenticated
  using (true);

-- =========================================================
-- User-owned favorites
-- Users can only access rows where favorites.user_id = auth.uid().
-- =========================================================

alter table public.favorites enable row level security;
drop policy if exists "Users can read their own favorites" on public.favorites;
drop policy if exists "Users can insert their own favorites" on public.favorites;
drop policy if exists "Users can update their own favorites" on public.favorites;
drop policy if exists "Users can delete their own favorites" on public.favorites;

create policy "Users can read their own favorites"
  on public.favorites
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own favorites"
  on public.favorites
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own favorites"
  on public.favorites
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own favorites"
  on public.favorites
  for delete
  to authenticated
  using (user_id = auth.uid());

-- favorite_verses is used by the Favorite Verse feature.
-- Users can only access rows where favorite_verses.user_id = auth.uid().
alter table public.favorite_verses enable row level security;
drop policy if exists "Users can read their own favorite verses" on public.favorite_verses;
drop policy if exists "Users can insert their own favorite verses" on public.favorite_verses;
drop policy if exists "Users can update their own favorite verses" on public.favorite_verses;
drop policy if exists "Users can delete their own favorite verses" on public.favorite_verses;

create policy "Users can read their own favorite verses"
  on public.favorite_verses
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own favorite verses"
  on public.favorite_verses
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own favorite verses"
  on public.favorite_verses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own favorite verses"
  on public.favorite_verses
  for delete
  to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- Smart reminders
-- Users can only access rows where reminders.user_id = auth.uid().
-- =========================================================

alter table public.reminders enable row level security;
drop policy if exists "Users can read their own reminders" on public.reminders;
drop policy if exists "Users can insert their own reminders" on public.reminders;
drop policy if exists "Users can update their own reminders" on public.reminders;
drop policy if exists "Users can delete their own reminders" on public.reminders;

create policy "Users can read their own reminders"
  on public.reminders
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own reminders"
  on public.reminders
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own reminders"
  on public.reminders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own reminders"
  on public.reminders
  for delete
  to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- User profiles
-- profiles.id is the auth user id, so ownership is profiles.id = auth.uid().
-- =========================================================

alter table public.profiles enable row level security;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can delete their own profile"
  on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

-- =========================================================
-- Temple photos
-- Add ownership and public approval metadata if missing.
-- Public can read approved photos. Authenticated users manage only their own rows.
-- =========================================================

alter table public.temple_photos
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_approved boolean not null default true;

create index if not exists temple_photos_user_id_idx
  on public.temple_photos (user_id);

alter table public.temple_photos enable row level security;
drop policy if exists "Public can read approved temple photos" on public.temple_photos;
drop policy if exists "Users can insert their own temple photos" on public.temple_photos;
drop policy if exists "Users can update their own temple photos" on public.temple_photos;
drop policy if exists "Users can delete their own temple photos" on public.temple_photos;

create policy "Public can read approved temple photos"
  on public.temple_photos
  for select
  to anon, authenticated
  using (is_approved = true);

create policy "Users can insert their own temple photos"
  on public.temple_photos
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own temple photos"
  on public.temple_photos
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own temple photos"
  on public.temple_photos
  for delete
  to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- Temple reviews
-- Public can read approved reviews. Authenticated users manage only their own rows.
-- =========================================================

alter table public.temple_reviews
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_approved boolean not null default true;

create index if not exists temple_reviews_user_id_idx
  on public.temple_reviews (user_id);

alter table public.temple_reviews enable row level security;
drop policy if exists "Public can read approved temple reviews" on public.temple_reviews;
drop policy if exists "Users can insert their own temple reviews" on public.temple_reviews;
drop policy if exists "Users can update their own temple reviews" on public.temple_reviews;
drop policy if exists "Users can delete their own temple reviews" on public.temple_reviews;

create policy "Public can read approved temple reviews"
  on public.temple_reviews
  for select
  to anon, authenticated
  using (is_approved = true);

create policy "Users can insert their own temple reviews"
  on public.temple_reviews
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own temple reviews"
  on public.temple_reviews
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own temple reviews"
  on public.temple_reviews
  for delete
  to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- OSM import progress
-- This table is used by server-side import scripts with the service role key.
-- No anon/authenticated policies are granted; service_role bypasses RLS.
-- =========================================================

alter table public.osm_import_progress enable row level security;

-- =========================================================
-- Storage bucket policies for temple photo files
-- These protect the Supabase Storage bucket used by TemplePhotoUpload.
-- Public can read files from the public bucket. Authenticated users can upload.
-- Updates/deletes are limited to storage objects owned by the authenticated user.
-- =========================================================

drop policy if exists "Public can read temple photo files" on storage.objects;
drop policy if exists "Authenticated users can upload temple photo files" on storage.objects;
drop policy if exists "Users can update their own temple photo files" on storage.objects;
drop policy if exists "Users can delete their own temple photo files" on storage.objects;

create policy "Public can read temple photo files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'temple-photos');

create policy "Authenticated users can upload temple photo files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'temple-photos'
    and owner = auth.uid()
  );

create policy "Users can update their own temple photo files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'temple-photos' and owner = auth.uid())
  with check (bucket_id = 'temple-photos' and owner = auth.uid());

create policy "Users can delete their own temple photo files"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'temple-photos' and owner = auth.uid());

commit;
