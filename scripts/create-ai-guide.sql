-- AI Religious Guide conversation history.
-- Safe to run more than once in Supabase SQL Editor.
--
-- App expectations:
-- public.ai_conversations:
--   id, user_id, title, created_at, updated_at
-- public.ai_messages:
--   id, conversation_id, user_id, role, content, created_at

create extension if not exists pgcrypto;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid()
);

alter table public.ai_conversations
  add column if not exists id uuid default gen_random_uuid();

alter table public.ai_messages
  add column if not exists id uuid default gen_random_uuid();

alter table public.ai_conversations
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text default 'New conversation',
  add column if not exists created_at timestamp with time zone default now(),
  add column if not exists updated_at timestamp with time zone default now();

alter table public.ai_messages
  add column if not exists conversation_id uuid,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists role text,
  add column if not exists content text,
  add column if not exists created_at timestamp with time zone default now();

alter table public.ai_conversations
  alter column id set default gen_random_uuid(),
  alter column title set default 'New conversation',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.ai_messages
  alter column id set default gen_random_uuid(),
  alter column created_at set default now();

update public.ai_conversations
set
  id = coalesce(id, gen_random_uuid()),
  title = coalesce(nullif(title, ''), 'New conversation'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where id is null
  or title is null
  or title = ''
  or created_at is null
  or updated_at is null;

update public.ai_messages
set
  id = coalesce(id, gen_random_uuid()),
  created_at = coalesce(created_at, now())
where id is null
  or created_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where contype = 'p'
      and conrelid = 'public.ai_conversations'::regclass
  )
  and not exists (
    select id
    from public.ai_conversations
    group by id
    having count(*) > 1
  )
  and not exists (
    select 1
    from public.ai_conversations
    where id is null
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where contype = 'p'
      and conrelid = 'public.ai_messages'::regclass
  )
  and not exists (
    select id
    from public.ai_messages
    group by id
    having count(*) > 1
  )
  and not exists (
    select 1
    from public.ai_messages
    where id is null
  ) then
    alter table public.ai_messages
      add constraint ai_messages_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversations_user_id_fkey'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_user_id_fkey'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_conversation_id_fkey'
      and conrelid = 'public.ai_messages'::regclass
  )
  and exists (
    select 1
    from pg_constraint
    where contype in ('p', 'u')
      and conrelid = 'public.ai_conversations'::regclass
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.ai_conversations'::regclass
            and attname = 'id'
        )
      ]::smallint[]
  ) then
    alter table public.ai_messages
      add constraint ai_messages_conversation_id_fkey
      foreign key (conversation_id)
      references public.ai_conversations(id)
      on delete cascade
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_role_check'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_role_check
      check (role in ('user', 'assistant'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversations_id_required'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_id_required
      check (id is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversations_user_id_required'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_user_id_required
      check (user_id is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversations_title_required'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_title_required
      check (title is not null and length(trim(title)) > 0)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversations_created_at_required'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_created_at_required
      check (created_at is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversations_updated_at_required'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_updated_at_required
      check (updated_at is not null)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_id_required'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_id_required
      check (id is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_conversation_id_required'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_conversation_id_required
      check (conversation_id is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_user_id_required'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_user_id_required
      check (user_id is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_role_required'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_role_required
      check (role is not null)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_content_required'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_content_required
      check (content is not null and length(trim(content)) > 0)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_created_at_required'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_created_at_required
      check (created_at is not null)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from public.ai_conversations
    where id is null
      or user_id is null
      or title is null
      or title = ''
      or created_at is null
      or updated_at is null
  ) then
    alter table public.ai_conversations
      alter column id set not null,
      alter column user_id set not null,
      alter column title set not null,
      alter column created_at set not null,
      alter column updated_at set not null;
  end if;

  if not exists (
    select 1
    from public.ai_messages
    where id is null
      or conversation_id is null
      or user_id is null
      or role is null
      or content is null
      or content = ''
      or created_at is null
  ) then
    alter table public.ai_messages
      alter column id set not null,
      alter column conversation_id set not null,
      alter column user_id set not null,
      alter column role set not null,
      alter column content set not null,
      alter column created_at set not null;
  end if;
end $$;

create index if not exists ai_conversations_user_id_updated_at_idx
  on public.ai_conversations(user_id, updated_at desc);

create index if not exists ai_messages_conversation_id_created_at_idx
  on public.ai_messages(conversation_id, created_at asc);

create index if not exists ai_messages_user_id_created_at_idx
  on public.ai_messages(user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "Users can read own AI conversations" on public.ai_conversations;
create policy "Users can read own AI conversations"
on public.ai_conversations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own AI conversations" on public.ai_conversations;
create policy "Users can create own AI conversations"
on public.ai_conversations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own AI conversations" on public.ai_conversations;
create policy "Users can update own AI conversations"
on public.ai_conversations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own AI conversations" on public.ai_conversations;
create policy "Users can delete own AI conversations"
on public.ai_conversations
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read own AI messages" on public.ai_messages;
create policy "Users can read own AI messages"
on public.ai_messages
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
      and ai_conversations.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own AI messages" on public.ai_messages;
create policy "Users can create own AI messages"
on public.ai_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
      and ai_conversations.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own AI messages" on public.ai_messages;
create policy "Users can update own AI messages"
on public.ai_messages
for update
to authenticated
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

drop policy if exists "Users can delete own AI messages" on public.ai_messages;
create policy "Users can delete own AI messages"
on public.ai_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
      and ai_conversations.user_id = auth.uid()
  )
);
