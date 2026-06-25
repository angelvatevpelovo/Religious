# RELIGIOUS

RELIGIOUS is a Next.js, TypeScript, Tailwind and Supabase app for spiritual life across religious traditions. It includes sacred texts, prayers, favorite verses, temples, an interactive world map, a religious calendar, smart reminders, user profiles, basic internationalization and a server-side AI Religious Assistant.

## Features

- Supabase authentication
- Religions and prayers
- Favorite prayers and Bible verses
- Holy books, chapters and verses
- KJV Bible import scripts
- Temples with images and detail pages
- Interactive Leaflet world map for temples
- Religious calendar
- Daily Spiritual Feed on the homepage
- Smart reminders
- User profiles
- English and Bulgarian UI language switcher
- Server-side AI Religious Assistant

## Required Environment Variables

Create a `.env.local` file for local development and add the same variables in Vercel Project Settings.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

Optional:

```env
OPENAI_MODEL=gpt-5.2
```

### Environment Safety

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose to the browser as public Supabase client configuration.
- `OPENAI_API_KEY` must never use the `NEXT_PUBLIC_` prefix.
- `OPENAI_API_KEY` is used only in `app/api/assistant/route.ts`, which runs server-side.
- `.env*` files are ignored by Git.

## Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run lint:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

Start production build locally:

```bash
npm run start
```

## Supabase Setup

Run the SQL files in `scripts/` inside the Supabase SQL Editor as needed:

- `scripts/create-religious-events.sql`
- `scripts/create-reminders.sql`
- `scripts/create-profiles.sql`
- `scripts/add-temple-image-url.sql`

Seed/import scripts are also in `scripts/`:

- `scripts/import-bible.js`
- `scripts/seed-temples.js`
- `scripts/seed-religious-events.js`

## Deployment on Vercel

1. Push the project to GitHub.
2. Create a new Vercel project and import the repository.
3. Use the default Next.js settings.
4. Add these Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - optional: `OPENAI_MODEL`
5. Deploy.

Vercel should run:

```bash
npm run build
```

## Production Notes

- Make sure Supabase Row Level Security policies are configured for user-owned data such as profiles, reminders and favorites.
- The AI Assistant requires `OPENAI_API_KEY` in Vercel environment variables.
- The language switcher stores the selected language in a `religious_locale` cookie.
- Database content is not translated yet; only core UI labels are prepared for English and Bulgarian.
