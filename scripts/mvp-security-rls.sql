-- RELIGIOUS MVP Supabase RLS/security audit migration.
-- Safe to run more than once.
-- This file only enables RLS and replaces policies. It does not drop tables,
-- truncate data, delete rows, or make destructive data changes.

begin;

create or replace function public.mvp_drop_policy_if_exists(
  target_schema text,
  target_table text,
  policy_name text
) returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = target_schema
      and tablename = target_table
      and policyname = policy_name
  ) then
    execute format('drop policy %I on %I.%I', policy_name, target_schema, target_table);
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.religions') is not null then
    alter table public.religions enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'religions', 'Public can read religions');
    perform public.mvp_drop_policy_if_exists('public', 'religions', 'MVP public read religions');
    create policy "MVP public read religions"
      on public.religions for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.prayers') is not null then
    alter table public.prayers enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'prayers', 'Public can read prayers');
    perform public.mvp_drop_policy_if_exists('public', 'prayers', 'MVP public read prayers');
    create policy "MVP public read prayers"
      on public.prayers for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.holy_books') is not null then
    alter table public.holy_books enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'holy_books', 'Public can read holy books');
    perform public.mvp_drop_policy_if_exists('public', 'holy_books', 'MVP public read holy books');
    create policy "MVP public read holy books"
      on public.holy_books for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.chapters') is not null then
    alter table public.chapters enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'chapters', 'Public can read chapters');
    perform public.mvp_drop_policy_if_exists('public', 'chapters', 'MVP public read chapters');
    create policy "MVP public read chapters"
      on public.chapters for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.verses') is not null then
    alter table public.verses enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'verses', 'Public can read verses');
    perform public.mvp_drop_policy_if_exists('public', 'verses', 'MVP public read verses');
    create policy "MVP public read verses"
      on public.verses for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.temples') is not null then
    alter table public.temples enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'temples', 'Public can read temples');
    perform public.mvp_drop_policy_if_exists('public', 'temples', 'MVP public read temples');
    create policy "MVP public read temples"
      on public.temples for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.religious_events') is not null then
    alter table public.religious_events enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'religious_events', 'Public can read religious events');
    perform public.mvp_drop_policy_if_exists('public', 'religious_events', 'MVP public read religious events');
    create policy "MVP public read religious events"
      on public.religious_events for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.favorites') is not null then
    alter table public.favorites enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'Users can read their own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'Users can insert their own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'Users can update their own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'Users can delete their own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'MVP users read own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'MVP users insert own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'MVP users update own favorites');
    perform public.mvp_drop_policy_if_exists('public', 'favorites', 'MVP users delete own favorites');
    create policy "MVP users read own favorites"
      on public.favorites for select to authenticated using (user_id = auth.uid());
    create policy "MVP users insert own favorites"
      on public.favorites for insert to authenticated with check (user_id = auth.uid());
    create policy "MVP users update own favorites"
      on public.favorites for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "MVP users delete own favorites"
      on public.favorites for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('public.favorite_verses') is not null then
    alter table public.favorite_verses enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'Users can read their own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'Users can insert their own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'Users can update their own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'Users can delete their own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'MVP users read own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'MVP users insert own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'MVP users update own favorite verses');
    perform public.mvp_drop_policy_if_exists('public', 'favorite_verses', 'MVP users delete own favorite verses');
    create policy "MVP users read own favorite verses"
      on public.favorite_verses for select to authenticated using (user_id = auth.uid());
    create policy "MVP users insert own favorite verses"
      on public.favorite_verses for insert to authenticated with check (user_id = auth.uid());
    create policy "MVP users update own favorite verses"
      on public.favorite_verses for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "MVP users delete own favorite verses"
      on public.favorite_verses for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('public.ai_conversations') is not null then
    alter table public.ai_conversations enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'Users can read own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'Users can create own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'Users can update own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'Users can delete own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'MVP users read own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'MVP users insert own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'MVP users update own AI conversations');
    perform public.mvp_drop_policy_if_exists('public', 'ai_conversations', 'MVP users delete own AI conversations');
    create policy "MVP users read own AI conversations"
      on public.ai_conversations for select to authenticated using (user_id = auth.uid());
    create policy "MVP users insert own AI conversations"
      on public.ai_conversations for insert to authenticated with check (user_id = auth.uid());
    create policy "MVP users update own AI conversations"
      on public.ai_conversations for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "MVP users delete own AI conversations"
      on public.ai_conversations for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
declare
  ai_messages_has_user_id boolean;
begin
  if to_regclass('public.ai_messages') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_messages'
        and column_name = 'user_id'
    ) into ai_messages_has_user_id;

    alter table public.ai_messages enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'Users can read own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'Users can create own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'Users can update own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'Users can delete own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'MVP users read own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'MVP users insert own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'MVP users update own AI messages');
    perform public.mvp_drop_policy_if_exists('public', 'ai_messages', 'MVP users delete own AI messages');

    if ai_messages_has_user_id then
      create policy "MVP users read own AI messages"
        on public.ai_messages for select to authenticated
        using (
          user_id = auth.uid()
          and exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
      create policy "MVP users insert own AI messages"
        on public.ai_messages for insert to authenticated
        with check (
          user_id = auth.uid()
          and exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
      create policy "MVP users update own AI messages"
        on public.ai_messages for update to authenticated
        using (
          user_id = auth.uid()
          and exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        )
        with check (
          user_id = auth.uid()
          and exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
      create policy "MVP users delete own AI messages"
        on public.ai_messages for delete to authenticated
        using (
          user_id = auth.uid()
          and exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
    else
      create policy "MVP users read own AI messages"
        on public.ai_messages for select to authenticated
        using (
          exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
      create policy "MVP users insert own AI messages"
        on public.ai_messages for insert to authenticated
        with check (
          exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
      create policy "MVP users update own AI messages"
        on public.ai_messages for update to authenticated
        using (
          exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        )
        with check (
          exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
      create policy "MVP users delete own AI messages"
        on public.ai_messages for delete to authenticated
        using (
          exists (
            select 1
            from public.ai_conversations
            where ai_conversations.id = ai_messages.conversation_id
              and ai_conversations.user_id = auth.uid()
          )
        );
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.reminders') is not null then
    alter table public.reminders enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'Users can read their own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'Users can create their own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'Users can update their own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'Users can delete their own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'MVP users read own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'MVP users insert own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'MVP users update own reminders');
    perform public.mvp_drop_policy_if_exists('public', 'reminders', 'MVP users delete own reminders');
    create policy "MVP users read own reminders"
      on public.reminders for select to authenticated using (user_id = auth.uid());
    create policy "MVP users insert own reminders"
      on public.reminders for insert to authenticated with check (user_id = auth.uid());
    create policy "MVP users update own reminders"
      on public.reminders for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "MVP users delete own reminders"
      on public.reminders for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'Users can read their own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'Users can insert their own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'Users can update their own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'Users can delete their own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'MVP users read own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'MVP users insert own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'MVP users update own profile');
    perform public.mvp_drop_policy_if_exists('public', 'profiles', 'MVP users delete own profile');
    create policy "MVP users read own profile"
      on public.profiles for select to authenticated using (id = auth.uid());
    create policy "MVP users insert own profile"
      on public.profiles for insert to authenticated with check (id = auth.uid());
    create policy "MVP users update own profile"
      on public.profiles for update to authenticated
      using (id = auth.uid()) with check (id = auth.uid());
    create policy "MVP users delete own profile"
      on public.profiles for delete to authenticated using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('public.temple_reviews') is not null then
    alter table public.temple_reviews enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'Public can read approved temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'Users can insert their own temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'Users can update their own temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'Users can delete their own temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'MVP public read temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'MVP users insert own temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'MVP users update own temple reviews');
    perform public.mvp_drop_policy_if_exists('public', 'temple_reviews', 'MVP users delete own temple reviews');
    create policy "MVP public read temple reviews"
      on public.temple_reviews for select to anon, authenticated using (true);

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'temple_reviews'
        and column_name = 'user_id'
    ) then
      create policy "MVP users insert own temple reviews"
        on public.temple_reviews for insert to authenticated with check (user_id = auth.uid());
      create policy "MVP users update own temple reviews"
        on public.temple_reviews for update to authenticated
        using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy "MVP users delete own temple reviews"
        on public.temple_reviews for delete to authenticated using (user_id = auth.uid());
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.temple_photos') is not null then
    alter table public.temple_photos enable row level security;
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'Public can read approved temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'Users can insert their own temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'Users can update their own temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'Users can delete their own temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'MVP public read temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'MVP users insert own temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'MVP users update own temple photos');
    perform public.mvp_drop_policy_if_exists('public', 'temple_photos', 'MVP users delete own temple photos');
    create policy "MVP public read temple photos"
      on public.temple_photos for select to anon, authenticated using (true);

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'temple_photos'
        and column_name = 'user_id'
    ) then
      create policy "MVP users insert own temple photos"
        on public.temple_photos for insert to authenticated with check (user_id = auth.uid());
      create policy "MVP users update own temple photos"
        on public.temple_photos for update to authenticated
        using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy "MVP users delete own temple photos"
        on public.temple_photos for delete to authenticated using (user_id = auth.uid());
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.osm_import_progress') is not null then
    alter table public.osm_import_progress enable row level security;
  end if;
end $$;

drop function if exists public.mvp_drop_policy_if_exists(text, text, text);
grant select on public.religions to anon, authenticated;
grant select on public.prayers to anon, authenticated;
grant select on public.holy_books to anon, authenticated;
grant select on public.chapters to anon, authenticated;
grant select on public.verses to anon, authenticated;
grant select on public.temples to anon, authenticated;

grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.favorite_verses to authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
commit;
