-- Foundation for multiple sacred books in RELIGIOUS.
-- Safe to run more than once. This file only adds metadata/label columns and indexes.

alter table public.holy_books
  add column if not exists religion text,
  add column if not exists tradition text,
  add column if not exists language text,
  add column if not exists source_url text,
  add column if not exists license text,
  add column if not exists translator text,
  add column if not exists public_domain boolean default false,
  add column if not exists text_type text default 'sectioned_text';

alter table public.chapters
  add column if not exists section_label text default 'Chapter',
  add column if not exists display_title text,
  add column if not exists sort_order integer;

alter table public.verses
  add column if not exists verse_label text default 'Verse',
  add column if not exists sort_order integer,
  add column if not exists original_text text,
  add column if not exists transliteration text;

create index if not exists idx_chapters_book_id_sort_order
  on public.chapters (book_id, sort_order);

create index if not exists idx_chapters_book_id_chapter_number
  on public.chapters (book_id, chapter_number);

create index if not exists idx_verses_chapter_id_sort_order
  on public.verses (chapter_id, sort_order);

create index if not exists idx_verses_chapter_id_verse_number
  on public.verses (chapter_id, verse_number);
