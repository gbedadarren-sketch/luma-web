# Luma — AI Study Assistant

Real-time AI study assistant for IU students. Upload slides, record lectures, ask questions.

## Stack
- React 18 + Vite
- Supabase (auth + database)
- Claude API (Haiku)
- Deployed on Vercel

## Setup in 5 minutes

### 1. Supabase
1. Go to https://supabase.com and create a free project
2. In your project dashboard → Settings → API
3. Copy "Project URL" and "anon/public" key

### 2. Local setup
```bash
cp .env.example .env
# Fill in your Supabase URL and anon key in .env

npm install
npm run dev
```

### 3. Deploy to Vercel
```bash
npm install -g vercel
vercel
# Follow the prompts, add env vars when asked
```

Or connect your GitHub repo at vercel.com for automatic deploys.

### 4. API Key
Users add their own Claude API key in Settings.
Get one at https://console.anthropic.com

## Supabase Database (optional, for full persistence)
Run this SQL in your Supabase SQL editor to add session persistence:

```sql
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  messages jsonb default '[]',
  created_at timestamptz default now()
);

alter table sessions enable row level security;
create policy "Users own their sessions" on sessions
  for all using (auth.uid() = user_id);
```

## Features
- Knowledge base (paste text + PDF upload via Claude API)
- Live transcription via Web Speech API
- Chat with Claude using your sources as context
- Anonymous escalation to professor
- Export notes as PDF
- Supabase auth (email/password)
