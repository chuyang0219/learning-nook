# Literary Memory App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, dark-mode-only spaced-repetition literary memory app where a single authenticated user actively recalls canonical facts about classic books they have read.

**Architecture:** Next.js 15 App Router at `literary-memory/` in the repo root, backed by Supabase (Postgres + Auth). Anthropic API (claude-sonnet-4-6) generates recall items once at book import — no AI during sessions. Custom scheduler selects due items; custom grader handles mastery transitions and quote matching. Server Actions for mutations.

**Tech Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase JS v2 · @anthropic-ai/sdk · Vitest

---

## Key Design Decisions (do not re-open)

- **No review screen** — trust AI, book activates immediately after import
- **Dark only** — no light mode, no toggle
- **Sessions** — ~10 mixed due items, grade immediately, no session state to resume
- **End screen** — minimal counts only ("12 recalled · 3 missed"), no praise
- **Mastery transitions** — unfamiliar→learning: 1 correct; learning→stable: 3 consecutive; stable→mastered: 5 consecutive; 2 consecutive wrong → back one state (not to unfamiliar)
- **FavoriteQuote stages** — 4 stages, advance on 3 consecutive correct, regress on 2 consecutive wrong
- **publication_century** — stored as "19th century" format, derived from publication_year

---

## File Map

```
literary-memory/
├── app/
│   ├── (auth)/login/page.tsx              # magic link login form
│   ├── (protected)/
│   │   ├── layout.tsx                     # auth guard
│   │   ├── dashboard/page.tsx             # entry point, due count, quick actions
│   │   ├── books/
│   │   │   ├── page.tsx                   # library list
│   │   │   └── [id]/page.tsx              # book profile
│   │   ├── import/page.tsx                # import flow
│   │   ├── session/
│   │   │   ├── page.tsx                   # recall session
│   │   │   └── SessionRunner.tsx          # client component for session loop
│   │   └── settings/page.tsx              # quote import from markdown
│   ├── auth/callback/route.ts             # Supabase auth callback
│   ├── layout.tsx                         # root layout (fonts, dark mode)
│   ├── globals.css
│   └── page.tsx                           # redirect to /dashboard
├── components/
│   ├── session/
│   │   ├── PromptCard.tsx
│   │   ├── AnswerInput.tsx                # adaptive: free text / multiple choice
│   │   ├── GradeReveal.tsx
│   │   └── SessionEnd.tsx
│   ├── books/
│   │   ├── BookListItem.tsx
│   │   ├── MemoryAnchors.tsx
│   │   ├── FavoriteQuotesSection.tsx
│   │   └── WeakAreas.tsx
│   └── layout/
│       ├── Nav.tsx
│       └── Container.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      # browser client
│   │   └── server.ts                      # server client
│   ├── scheduler.ts                       # interval calc + session composition
│   ├── grader.ts                          # grading + mastery transitions + quote matching
│   ├── ai/
│   │   ├── generate.ts                    # Anthropic API call
│   │   ├── prompt.ts                      # system + user prompt strings
│   │   └── validate.ts                    # AI JSON schema validation
│   └── metadata/
│       └── openlibrary.ts                 # OpenLibrary metadata lookup
├── types/index.ts                         # shared TS types
├── actions/
│   ├── import.ts                          # server action: import book
│   ├── session.ts                         # server actions: start/submit session
│   ├── quotes.ts                          # server actions: favourite quote CRUD
│   └── settings.ts                        # server action: markdown quote import
├── supabase/migrations/001_initial.sql    # full schema + RLS
├── __tests__/
│   ├── grader.test.ts
│   ├── scheduler.test.ts
│   ├── validate.test.ts
│   └── openlibrary.test.ts
├── vitest.config.ts
├── .env.local                             # gitignored
├── .env.example
└── package.json
```

---

## Task 1: Project Initialisation

**Files:**
- Create: `literary-memory/` (Next.js project)
- Create: `literary-memory/.env.example`
- Create: `literary-memory/vitest.config.ts`

- [ ] **Step 1: Scaffold Next.js project**

Run from repo root (`/Users/chuyiyang/Documents/learning-nook/`):
```bash
npx create-next-app@latest literary-memory \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias "@/*" \
  --turbopack
```

- [ ] **Step 2: Install runtime dependencies**

```bash
cd literary-memory
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk
npx shadcn@latest init
# When prompted: style=default, base colour=neutral, CSS variables=yes
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8
```

- [ ] **Step 4: Create vitest config**

```ts
// literary-memory/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Add test scripts to package.json**

In `literary-memory/package.json` scripts object, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create .env.example**

```bash
# literary-memory/.env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

- [ ] **Step 7: Copy to .env.local and fill real values**

```bash
cp .env.example .env.local
# Open .env.local and fill in Supabase project URL, anon key, Anthropic API key
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: server at http://localhost:3000, default Next.js page visible

- [ ] **Step 9: Commit**

```bash
cd ..
git add literary-memory/
git commit -m "feat: scaffold Next.js 15 literary memory app"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `literary-memory/types/index.ts`

- [ ] **Step 1: Write types**

```ts
// literary-memory/types/index.ts

export type RecallType =
  | 'author'
  | 'publication_century'
  | 'opening_line'
  | 'major_character'
  | 'character_relationship'
  | 'quote_attribution'
  | 'quote_completion'
  | 'quote_verbatim'
  | 'theme_identifier'
  | 'setting'
  | 'title_from_quote'
  | 'cultural_trivia'

export type ImportanceLevel = 'iconic' | 'strong' | 'secondary'
export type MasteryState = 'unfamiliar' | 'learning' | 'stable' | 'mastered'

export interface Book {
  id: string
  user_id: string
  title: string
  author: string
  publication_year: number | null
  publication_century: string
  tradition: string | null
  language: string | null
  synopsis_short: string | null
  memory_anchors: string[] | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface RecallItem {
  id: string
  user_id: string
  book_id: string
  type: RecallType
  prompt: string
  answer: string
  alternate_answers: string[] | null
  metadata: Record<string, unknown> | null
  importance: ImportanceLevel
  mastery: MasteryState
  consecutive_correct: number
  consecutive_wrong: number
  times_seen: number
  times_correct: number
  last_seen_at: string | null
  next_due_at: string | null
  created_at: string
}

export interface FavoriteQuote {
  id: string
  user_id: string
  book_id: string
  quote_text: string
  source_location: string | null
  memorization_stage: number
  consecutive_correct: number
  consecutive_wrong: number
  last_seen_at: string | null
  next_due_at: string | null
  created_at: string
}

export interface SessionItem {
  type: 'recall'
  recallItem: RecallItem
  book: Book
}

export type SessionMode =
  | 'general'
  | 'quotes_only'
  | 'recently_missed'
  | 'short'
  | 'long'

export interface AIGenerationOutput {
  memory_anchors: string[]
  recall_items: Array<{
    type: RecallType
    importance: ImportanceLevel
    prompt: string
    answer: string
    alternate_answers?: string[]
  }>
}
```

- [ ] **Step 2: Commit**

```bash
git add literary-memory/types/
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Database Schema

**Files:**
- Create: `literary-memory/supabase/migrations/001_initial.sql`

- [ ] **Step 1: Write migration**

```sql
-- literary-memory/supabase/migrations/001_initial.sql

create type recall_type as enum (
  'author', 'publication_century', 'opening_line', 'major_character',
  'character_relationship', 'quote_attribution', 'quote_completion',
  'quote_verbatim', 'theme_identifier', 'setting', 'title_from_quote',
  'cultural_trivia'
);

create type importance_level as enum ('iconic', 'strong', 'secondary');
create type mastery_state as enum ('unfamiliar', 'learning', 'stable', 'mastered');

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  author text not null,
  publication_year integer,
  publication_century text not null,
  tradition text,
  language text,
  synopsis_short text,
  memory_anchors jsonb,
  cover_image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index books_user_id_idx on books(user_id);

create table recall_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  type recall_type not null,
  prompt text not null,
  answer text not null,
  alternate_answers jsonb,
  metadata jsonb,
  importance importance_level default 'strong' not null,
  mastery mastery_state default 'unfamiliar' not null,
  consecutive_correct integer default 0 not null,
  consecutive_wrong integer default 0 not null,
  times_seen integer default 0 not null,
  times_correct integer default 0 not null,
  last_seen_at timestamptz,
  next_due_at timestamptz,
  created_at timestamptz default now() not null
);

create index recall_items_user_id_idx on recall_items(user_id);
create index recall_items_book_id_idx on recall_items(book_id);
create index recall_items_next_due_idx on recall_items(next_due_at);

create table favorite_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  quote_text text not null,
  source_location text,
  memorization_stage integer default 1 not null,
  consecutive_correct integer default 0 not null,
  consecutive_wrong integer default 0 not null,
  last_seen_at timestamptz,
  next_due_at timestamptz,
  created_at timestamptz default now() not null,
  constraint unique_user_quote unique (user_id, quote_text)
);

create index favorite_quotes_user_id_idx on favorite_quotes(user_id);
create index favorite_quotes_book_id_idx on favorite_quotes(book_id);
create index favorite_quotes_next_due_idx on favorite_quotes(next_due_at);

-- RLS
alter table books enable row level security;
alter table recall_items enable row level security;
alter table favorite_quotes enable row level security;

create policy "users own books" on books for all using (auth.uid() = user_id);
create policy "users own recall_items" on recall_items for all using (auth.uid() = user_id);
create policy "users own favorite_quotes" on favorite_quotes for all using (auth.uid() = user_id);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger books_updated_at
  before update on books
  for each row execute function update_updated_at();
```

- [ ] **Step 2: Apply to Supabase**

In Supabase dashboard → SQL Editor, run the entire migration SQL above.

- [ ] **Step 3: Verify tables exist**

In Supabase dashboard → Table Editor, confirm `books`, `recall_items`, `favorite_quotes` all exist with correct columns and RLS enabled (shield icon).

- [ ] **Step 4: Commit migration**

```bash
git add literary-memory/supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

## Task 4: Supabase Clients

**Files:**
- Create: `literary-memory/lib/supabase/client.ts`
- Create: `literary-memory/lib/supabase/server.ts`

- [ ] **Step 1: Write browser client**

```ts
// literary-memory/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write server client**

```ts
// literary-memory/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add literary-memory/lib/supabase/
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 5: Auth — Magic Link + Protected Routes

**Files:**
- Create: `literary-memory/app/(auth)/login/page.tsx`
- Create: `literary-memory/app/auth/callback/route.ts`
- Create: `literary-memory/middleware.ts`
- Create: `literary-memory/app/(protected)/layout.tsx`
- Create: `literary-memory/app/layout.tsx`
- Create: `literary-memory/app/globals.css`
- Create: `literary-memory/app/page.tsx`
- Create: `literary-memory/components/layout/Nav.tsx`
- Create: `literary-memory/components/layout/Container.tsx`

- [ ] **Step 1: Update root layout with fonts and dark theme**

```tsx
// literary-memory/app/layout.tsx
import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Literary Memory',
  description: 'Private literary recall system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${cormorant.variable} ${inter.variable} font-sans bg-neutral-950 text-neutral-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update globals.css**

Replace the generated `globals.css` content with:
```css
/* literary-memory/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Update tailwind.config.ts to register font variables**

In `literary-memory/tailwind.config.ts`, extend the theme:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 4: Root redirect**

```tsx
// literary-memory/app/page.tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 5: Create login page**

```tsx
// literary-memory/app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setSent(true)
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-400">Check your email for a sign-in link.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-80">
        <h1 className="font-serif text-3xl text-neutral-100">Literary Memory</h1>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors"
        >
          Send sign-in link
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 6: Create auth callback route**

```ts
// literary-memory/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

- [ ] **Step 7: Create middleware**

```ts
// literary-memory/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = ['/dashboard', '/books', '/import', '/session', '/settings']
    .some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/).*)'],
}
```

- [ ] **Step 8: Create protected layout**

```tsx
// literary-memory/app/(protected)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/layout/Nav'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      <Nav />
      {children}
    </div>
  )
}
```

- [ ] **Step 9: Create Nav**

```tsx
// literary-memory/components/layout/Nav.tsx
import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="border-b border-neutral-800 px-6 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-lg text-neutral-100">
          Literary Memory
        </Link>
        <div className="flex gap-6 text-sm text-neutral-400">
          <Link href="/books" className="hover:text-neutral-100 transition-colors">Library</Link>
          <Link href="/session" className="hover:text-neutral-100 transition-colors">Recall</Link>
          <Link href="/import" className="hover:text-neutral-100 transition-colors">Add Book</Link>
          <Link href="/settings" className="hover:text-neutral-100 transition-colors">Settings</Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 10: Create Container**

```tsx
// literary-memory/components/layout/Container.tsx
export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {children}
    </div>
  )
}
```

- [ ] **Step 11: Verify auth flow**

```bash
npm run dev
```
Visit http://localhost:3000 → redirects to /dashboard → middleware redirects to /login. Enter email → "Check your email" message appears. Click magic link → lands at /dashboard (empty for now).

- [ ] **Step 12: Commit**

```bash
git add literary-memory/app/ literary-memory/middleware.ts literary-memory/components/ literary-memory/tailwind.config.ts
git commit -m "feat: add magic link auth with protected route middleware"
```

---

## Task 6: Grader (TDD)

Core logic — build and test before anything that depends on it.

**Files:**
- Create: `literary-memory/__tests__/grader.test.ts`
- Create: `literary-memory/lib/grader.ts`

- [ ] **Step 1: Write failing tests**

```ts
// literary-memory/__tests__/grader.test.ts
import { describe, it, expect } from 'vitest'
import {
  normaliseText,
  quoteMatches,
  transitionMastery,
  computeNextDue,
} from '../lib/grader'

describe('normaliseText', () => {
  it('lowercases and strips punctuation', () => {
    expect(normaliseText('Hello, World!')).toBe('hello world')
  })
  it('collapses whitespace', () => {
    expect(normaliseText('  two   spaces  ')).toBe('two spaces')
  })
})

describe('quoteMatches', () => {
  it('returns true for identical strings', () => {
    const q = 'Whatever our souls are made of his and mine are the same'
    expect(quoteMatches(q, q)).toBe(true)
  })
  it('returns true with minor punctuation difference', () => {
    expect(quoteMatches(
      'Whatever our souls are made of his and mine are the same',
      'Whatever our souls are made of, his and mine are the same.'
    )).toBe(true)
  })
  it('returns false for paraphrase', () => {
    expect(quoteMatches(
      'Our souls are one and the same',
      'Whatever our souls are made of, his and mine are the same.'
    )).toBe(false)
  })
  it('exact short quote matches', () => {
    expect(quoteMatches('Call me Ishmael', 'Call me Ishmael.')).toBe(true)
  })
  it('wrong short quote does not match', () => {
    expect(quoteMatches('Call me Bob', 'Call me Ishmael.')).toBe(false)
  })
})

describe('transitionMastery', () => {
  it('unfamiliar → learning after 1 correct', () => {
    expect(transitionMastery('unfamiliar', true, 0, 0)).toEqual({
      mastery: 'learning',
      consecutiveCorrect: 1,
      consecutiveWrong: 0,
    })
  })
  it('learning → stable after 3 consecutive correct', () => {
    expect(transitionMastery('learning', true, 2, 0)).toEqual({
      mastery: 'stable',
      consecutiveCorrect: 3,
      consecutiveWrong: 0,
    })
  })
  it('stable stays stable at 4 consecutive correct', () => {
    expect(transitionMastery('stable', true, 3, 0)).toEqual({
      mastery: 'stable',
      consecutiveCorrect: 4,
      consecutiveWrong: 0,
    })
  })
  it('stable → mastered after 5 consecutive correct', () => {
    expect(transitionMastery('stable', true, 4, 0)).toEqual({
      mastery: 'mastered',
      consecutiveCorrect: 5,
      consecutiveWrong: 0,
    })
  })
  it('mastered → stable after 2 consecutive wrong', () => {
    expect(transitionMastery('mastered', false, 0, 1)).toEqual({
      mastery: 'stable',
      consecutiveCorrect: 0,
      consecutiveWrong: 2,
    })
  })
  it('unfamiliar stays unfamiliar with 2 consecutive wrong', () => {
    expect(transitionMastery('unfamiliar', false, 0, 1)).toEqual({
      mastery: 'unfamiliar',
      consecutiveCorrect: 0,
      consecutiveWrong: 2,
    })
  })
  it('correct resets consecutive_wrong', () => {
    const result = transitionMastery('stable', true, 0, 3)
    expect(result.consecutiveWrong).toBe(0)
  })
  it('wrong resets consecutive_correct', () => {
    const result = transitionMastery('stable', false, 4, 0)
    expect(result.consecutiveCorrect).toBe(0)
  })
})

describe('computeNextDue', () => {
  const now = new Date('2026-05-14T12:00:00Z')

  it('wrong unfamiliar → 10 minutes', () => {
    const due = computeNextDue('unfamiliar', 'strong', false, now)
    expect(due.getTime() - now.getTime()).toBe(10 * 60 * 1000)
  })
  it('correct unfamiliar → 1 day', () => {
    const due = computeNextDue('unfamiliar', 'strong', true, now)
    expect(due.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000)
  })
  it('iconic items resurface sooner than strong', () => {
    const strong = computeNextDue('mastered', 'strong', true, now)
    const iconic = computeNextDue('mastered', 'iconic', true, now)
    expect(iconic.getTime()).toBeLessThan(strong.getTime())
  })
  it('secondary items resurface later than strong', () => {
    const strong = computeNextDue('stable', 'strong', true, now)
    const secondary = computeNextDue('stable', 'secondary', true, now)
    expect(secondary.getTime()).toBeGreaterThan(strong.getTime())
  })
  it('correct mastered → ~30 days for strong', () => {
    const due = computeNextDue('mastered', 'strong', true, now)
    const days = (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    expect(days).toBeCloseTo(30, 0)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd literary-memory && npx vitest run __tests__/grader.test.ts
```
Expected: `FAIL` with "Cannot find module '../lib/grader'"

- [ ] **Step 3: Implement grader**

```ts
// literary-memory/lib/grader.ts
import type { MasteryState, ImportanceLevel } from '@/types'

export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normaliseText(a).split(' '))
  const tokensB = new Set(normaliseText(b).split(' '))
  let overlap = 0
  tokensA.forEach(t => { if (tokensB.has(t)) overlap++ })
  return overlap / Math.max(tokensA.size, tokensB.size)
}

export function quoteMatches(answer: string, correct: string): boolean {
  const normCorrect = normaliseText(correct)
  const wordCount = normCorrect.split(' ').length
  const threshold = wordCount < 10 ? 0.95 : 0.90
  return tokenOverlap(answer, correct) >= threshold
}

interface MasteryTransitionResult {
  mastery: MasteryState
  consecutiveCorrect: number
  consecutiveWrong: number
}

export function transitionMastery(
  current: MasteryState,
  correct: boolean,
  consecutiveCorrect: number,
  consecutiveWrong: number
): MasteryTransitionResult {
  const order: MasteryState[] = ['unfamiliar', 'learning', 'stable', 'mastered']
  const idx = order.indexOf(current)

  if (correct) {
    const newConsec = consecutiveCorrect + 1
    const thresholds: Record<MasteryState, number> = {
      unfamiliar: 1,
      learning: 3,
      stable: 5,
      mastered: Infinity,
    }
    const shouldAdvance = newConsec >= thresholds[current] && idx < order.length - 1
    return {
      mastery: shouldAdvance ? order[idx + 1] : current,
      consecutiveCorrect: newConsec,
      consecutiveWrong: 0,
    }
  } else {
    const newWrong = consecutiveWrong + 1
    const shouldRegress = newWrong >= 2 && idx > 0
    return {
      mastery: shouldRegress ? order[idx - 1] : current,
      consecutiveCorrect: 0,
      consecutiveWrong: newWrong,
    }
  }
}

const CORRECT_INTERVALS_MS: Record<MasteryState, number> = {
  unfamiliar: 1 * 24 * 60 * 60 * 1000,
  learning:   3 * 24 * 60 * 60 * 1000,
  stable:     7 * 24 * 60 * 60 * 1000,
  mastered:  30 * 24 * 60 * 60 * 1000,
}

const WRONG_INTERVALS_MS: Record<MasteryState, number> = {
  unfamiliar:      10 * 60 * 1000,
  learning:   1 * 24 * 60 * 60 * 1000,
  stable:     3 * 24 * 60 * 60 * 1000,
  mastered:   7 * 24 * 60 * 60 * 1000,
}

const IMPORTANCE_MULTIPLIERS: Record<ImportanceLevel, number> = {
  iconic:    0.7,
  strong:    1.0,
  secondary: 1.5,
}

export function computeNextDue(
  mastery: MasteryState,
  importance: ImportanceLevel,
  correct: boolean,
  now: Date = new Date()
): Date {
  const base = correct ? CORRECT_INTERVALS_MS[mastery] : WRONG_INTERVALS_MS[mastery]
  const interval = Math.round(base * IMPORTANCE_MULTIPLIERS[importance])
  return new Date(now.getTime() + interval)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/grader.test.ts
```
Expected: all tests green ✓

- [ ] **Step 5: Commit**

```bash
git add literary-memory/lib/grader.ts literary-memory/__tests__/grader.test.ts
git commit -m "feat: add grader with mastery transitions and quote matching (TDD)"
```

---

## Task 7: Scheduler (TDD)

**Files:**
- Create: `literary-memory/__tests__/scheduler.test.ts`
- Create: `literary-memory/lib/scheduler.ts`

- [ ] **Step 1: Write failing tests**

```ts
// literary-memory/__tests__/scheduler.test.ts
import { describe, it, expect } from 'vitest'
import { isDue, selectSessionItems } from '../lib/scheduler'
import type { RecallItem, Book } from '../types'

function makeItem(overrides: Partial<RecallItem> = {}): RecallItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    book_id: 'book-1',
    type: 'author',
    prompt: 'Who wrote this?',
    answer: 'Author Name',
    alternate_answers: null,
    metadata: null,
    importance: 'strong',
    mastery: 'unfamiliar',
    consecutive_correct: 0,
    consecutive_wrong: 0,
    times_seen: 0,
    times_correct: 0,
    last_seen_at: null,
    next_due_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeBook(id = 'book-1'): Book {
  return {
    id,
    user_id: 'user-1',
    title: 'Test Book',
    author: 'Author',
    publication_year: 1900,
    publication_century: '20th century',
    tradition: null,
    language: null,
    synopsis_short: null,
    memory_anchors: null,
    cover_image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

describe('isDue', () => {
  it('null next_due_at is due', () => {
    expect(isDue(makeItem({ next_due_at: null }))).toBe(true)
  })
  it('past next_due_at is due', () => {
    expect(isDue(makeItem({ next_due_at: new Date(Date.now() - 1000).toISOString() }))).toBe(true)
  })
  it('future next_due_at is not due', () => {
    expect(isDue(makeItem({ next_due_at: new Date(Date.now() + 60000).toISOString() }))).toBe(false)
  })
})

describe('selectSessionItems', () => {
  const books = new Map([['book-1', makeBook('book-1')]])

  it('returns at most count items', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({ id: `item-${i}`, next_due_at: null })
    )
    const result = selectSessionItems(items, books, { count: 10 })
    expect(result.length).toBeLessThanOrEqual(10)
  })

  it('prioritises due items over not-due', () => {
    const due = makeItem({ id: 'due', next_due_at: new Date(Date.now() - 1000).toISOString() })
    const notDue = makeItem({ id: 'not-due', next_due_at: new Date(Date.now() + 99999).toISOString() })
    const result = selectSessionItems([notDue, due], books, { count: 1 })
    expect(result[0].recallItem.id).toBe('due')
  })

  it('avoids consecutive same-book items when alternatives exist', () => {
    const book2 = makeBook('book-2')
    const twoBooks = new Map([['book-1', makeBook('book-1')], ['book-2', book2]])
    const items = [
      makeItem({ id: 'a1', book_id: 'book-1' }),
      makeItem({ id: 'a2', book_id: 'book-1' }),
      makeItem({ id: 'b1', book_id: 'book-2' }),
    ]
    const result = selectSessionItems(items, twoBooks, { count: 3 })
    const bookIds = result.map(r => r.recallItem.book_id)
    for (let i = 1; i < bookIds.length; i++) {
      if (bookIds[i - 1] === 'book-1') {
        expect(bookIds[i]).not.toBe('book-1')
      }
    }
  })

  it('attaches correct book to each session item', () => {
    const items = [makeItem({ id: 'x', book_id: 'book-1' })]
    const result = selectSessionItems(items, books, { count: 5 })
    expect(result[0].book.id).toBe('book-1')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/scheduler.test.ts
```
Expected: `FAIL` with "Cannot find module '../lib/scheduler'"

- [ ] **Step 3: Implement scheduler**

```ts
// literary-memory/lib/scheduler.ts
import type { RecallItem, FavoriteQuote, Book, SessionItem } from '@/types'

export function isDue(item: RecallItem | FavoriteQuote): boolean {
  if (!item.next_due_at) return true
  return new Date(item.next_due_at) <= new Date()
}

interface SelectOptions {
  count?: number
  bookId?: string
}

const IMPORTANCE_SCORE = { iconic: 3, strong: 2, secondary: 1 } as const

export function selectSessionItems(
  recallItems: RecallItem[],
  books: Map<string, Book>,
  options: SelectOptions = {}
): SessionItem[] {
  const { count = 10, bookId } = options

  const candidates = bookId
    ? recallItems.filter(item => item.book_id === bookId)
    : recallItems

  const due = candidates
    .filter(isDue)
    .sort((a, b) => IMPORTANCE_SCORE[b.importance] - IMPORTANCE_SCORE[a.importance])

  const notDue = candidates
    .filter(item => !isDue(item))
    .sort((a, b) => {
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
      return aTime - bTime
    })

  const pool = [...due, ...notDue].slice(0, count * 2)
  const selected = avoidConsecutiveSameBook(pool, count)

  return selected.map(item => ({
    type: 'recall' as const,
    recallItem: item,
    book: books.get(item.book_id)!,
  }))
}

function avoidConsecutiveSameBook(items: RecallItem[], count: number): RecallItem[] {
  const result: RecallItem[] = []
  const remaining = [...items]

  while (result.length < count && remaining.length > 0) {
    const lastBookId = result.at(-1)?.book_id
    if (!lastBookId) {
      result.push(remaining.shift()!)
      continue
    }
    const idx = remaining.findIndex(item => item.book_id !== lastBookId)
    if (idx === -1) {
      result.push(remaining.shift()!)
    } else {
      result.push(...remaining.splice(idx, 1))
    }
  }

  return result
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/scheduler.test.ts
```
Expected: all tests green ✓

- [ ] **Step 5: Commit**

```bash
git add literary-memory/lib/scheduler.ts literary-memory/__tests__/scheduler.test.ts
git commit -m "feat: add session scheduler with due-item prioritisation (TDD)"
```

---

## Task 8: AI JSON Validation (TDD)

**Files:**
- Create: `literary-memory/__tests__/validate.test.ts`
- Create: `literary-memory/lib/ai/validate.ts`

- [ ] **Step 1: Write failing tests**

```ts
// literary-memory/__tests__/validate.test.ts
import { describe, it, expect } from 'vitest'
import { validateAIOutput } from '../lib/ai/validate'

describe('validateAIOutput', () => {
  it('accepts valid output', () => {
    const valid = {
      memory_anchors: ['guilt', 'Petersburg'],
      recall_items: [{
        type: 'author',
        importance: 'iconic',
        prompt: 'Who wrote Crime and Punishment?',
        answer: 'Fyodor Dostoevsky',
      }],
    }
    expect(() => validateAIOutput(valid)).not.toThrow()
  })

  it('rejects missing memory_anchors', () => {
    expect(() => validateAIOutput({ recall_items: [] })).toThrow()
  })

  it('rejects invalid recall_type', () => {
    const bad = {
      memory_anchors: [],
      recall_items: [{ type: 'INVALID', importance: 'iconic', prompt: 'Q', answer: 'A' }],
    }
    expect(() => validateAIOutput(bad)).toThrow(/recall type/)
  })

  it('rejects invalid importance level', () => {
    const bad = {
      memory_anchors: [],
      recall_items: [{ type: 'author', importance: 'legendary', prompt: 'Q', answer: 'A' }],
    }
    expect(() => validateAIOutput(bad)).toThrow(/importance/)
  })

  it('returns typed output on success', () => {
    const valid = {
      memory_anchors: ['guilt'],
      recall_items: [{ type: 'author', importance: 'iconic', prompt: 'Q', answer: 'A' }],
    }
    const result = validateAIOutput(valid)
    expect(result.memory_anchors).toEqual(['guilt'])
    expect(result.recall_items).toHaveLength(1)
  })

  it('accepts optional alternate_answers', () => {
    const valid = {
      memory_anchors: [],
      recall_items: [{
        type: 'author',
        importance: 'strong',
        prompt: 'Q',
        answer: 'A',
        alternate_answers: ['B', 'C'],
      }],
    }
    expect(() => validateAIOutput(valid)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/validate.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement validator**

```ts
// literary-memory/lib/ai/validate.ts
import type { AIGenerationOutput } from '@/types'

const VALID_TYPES = new Set([
  'author', 'publication_century', 'opening_line', 'major_character',
  'character_relationship', 'quote_attribution', 'quote_completion',
  'quote_verbatim', 'theme_identifier', 'setting', 'title_from_quote',
  'cultural_trivia',
])

const VALID_IMPORTANCE = new Set(['iconic', 'strong', 'secondary'])

export function validateAIOutput(raw: unknown): AIGenerationOutput {
  if (!raw || typeof raw !== 'object') throw new Error('AI output must be an object')
  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj.memory_anchors)) throw new Error('memory_anchors must be an array')
  if (!Array.isArray(obj.recall_items)) throw new Error('recall_items must be an array')

  for (const item of obj.recall_items) {
    if (!item || typeof item !== 'object') throw new Error('Each recall_item must be an object')
    const ri = item as Record<string, unknown>
    if (!VALID_TYPES.has(ri.type as string)) throw new Error(`Invalid recall type: ${ri.type}`)
    if (!VALID_IMPORTANCE.has(ri.importance as string)) throw new Error(`Invalid importance: ${ri.importance}`)
    if (typeof ri.prompt !== 'string') throw new Error('prompt must be a string')
    if (typeof ri.answer !== 'string') throw new Error('answer must be a string')
  }

  return obj as unknown as AIGenerationOutput
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx vitest run __tests__/validate.test.ts
```
Expected: all green ✓

- [ ] **Step 5: Commit**

```bash
git add literary-memory/lib/ai/validate.ts literary-memory/__tests__/validate.test.ts
git commit -m "feat: add AI output schema validation (TDD)"
```

---

## Task 9: OpenLibrary Metadata (TDD)

**Files:**
- Create: `literary-memory/__tests__/openlibrary.test.ts`
- Create: `literary-memory/lib/metadata/openlibrary.ts`

- [ ] **Step 1: Write failing tests**

```ts
// literary-memory/__tests__/openlibrary.test.ts
import { describe, it, expect } from 'vitest'
import { derivePublicationCentury, parseOpenLibraryResponse } from '../lib/metadata/openlibrary'

describe('derivePublicationCentury', () => {
  it('1813 → 19th century', () => {
    expect(derivePublicationCentury(1813)).toBe('19th century')
  })
  it('1900 → 19th century', () => {
    expect(derivePublicationCentury(1900)).toBe('19th century')
  })
  it('1901 → 20th century', () => {
    expect(derivePublicationCentury(1901)).toBe('20th century')
  })
  it('2001 → 21st century', () => {
    expect(derivePublicationCentury(2001)).toBe('21st century')
  })
  it('2000 → 20th century', () => {
    expect(derivePublicationCentury(2000)).toBe('20th century')
  })
})

describe('parseOpenLibraryResponse', () => {
  it('extracts title, author, year, and century', () => {
    const raw = {
      title: 'Pride and Prejudice',
      first_publish_year: 1813,
      author_name: ['Jane Austen'],
    }
    const result = parseOpenLibraryResponse(raw)
    expect(result.title).toBe('Pride and Prejudice')
    expect(result.author).toBe('Jane Austen')
    expect(result.publication_year).toBe(1813)
    expect(result.publication_century).toBe('19th century')
  })

  it('handles missing year gracefully', () => {
    const raw = { title: 'Unknown', author_name: ['Someone'] }
    const result = parseOpenLibraryResponse(raw)
    expect(result.publication_year).toBeNull()
    expect(result.publication_century).toBe('Unknown century')
  })

  it('handles missing author', () => {
    const raw = { title: 'No Author', first_publish_year: 1900 }
    const result = parseOpenLibraryResponse(raw)
    expect(result.author).toBe('')
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/openlibrary.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// literary-memory/lib/metadata/openlibrary.ts

const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }

function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`
}

export function derivePublicationCentury(year: number): string {
  const n = Math.ceil(year / 100)
  return `${ordinal(n)} century`
}

export interface ParsedMetadata {
  title: string
  author: string
  publication_year: number | null
  publication_century: string
}

export function parseOpenLibraryResponse(raw: Record<string, unknown>): ParsedMetadata {
  const title = String(raw.title ?? '')
  const authorNames = raw.author_name as string[] | undefined
  const author = authorNames?.[0] ?? ''
  const year = typeof raw.first_publish_year === 'number' ? raw.first_publish_year : null

  return {
    title,
    author,
    publication_year: year,
    publication_century: year ? derivePublicationCentury(year) : 'Unknown century',
  }
}

export async function fetchOpenLibraryMetadata(
  title: string,
  author?: string
): Promise<ParsedMetadata | null> {
  const query = author ? `${title} ${author}` : title
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,first_publish_year`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const doc = data?.docs?.[0]
    if (!doc) return null
    return parseOpenLibraryResponse(doc)
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx vitest run __tests__/openlibrary.test.ts
```
Expected: all green ✓

- [ ] **Step 5: Run all tests together**

```bash
npx vitest run
```
Expected: all 4 test files pass

- [ ] **Step 6: Commit**

```bash
git add literary-memory/lib/metadata/ literary-memory/__tests__/openlibrary.test.ts
git commit -m "feat: add OpenLibrary metadata with century derivation (TDD)"
```

---

## Task 10: AI Prompt + Generation

**Files:**
- Create: `literary-memory/lib/ai/prompt.ts`
- Create: `literary-memory/lib/ai/generate.ts`

- [ ] **Step 1: Write prompt strings**

```ts
// literary-memory/lib/ai/prompt.ts

export const SYSTEM_PROMPT = `You generate cultural literary memory profiles for well-read people.

Your task: identify what a genuinely well-read person would plausibly retain years after reading a book — not trivia, not fan-wiki detail, not undergraduate essay content.

Prioritise:
- culturally iconic associations
- memorable character names (especially protagonists)
- famous opening lines
- emotionally salient facts
- strong thematic identifiers
- commonly remembered quotes and their attributions

Avoid:
- obscure chapter-level events
- incidental minor characters
- speculative symbolism
- overconfident interpretation
- exhaustive completeness

Output ONLY valid JSON — no markdown fences, no explanation:
{
  "memory_anchors": ["short phrase", ...],
  "recall_items": [
    {
      "type": "<type>",
      "importance": "iconic" | "strong" | "secondary",
      "prompt": "<question>",
      "answer": "<canonical answer>",
      "alternate_answers": ["<distractor1>", "<distractor2>"]
    }
  ]
}

Recall types:
- author: who wrote the book
- publication_century: in "19th century" format
- opening_line: the famous first line
- major_character: a significant character name
- character_relationship: how two characters relate
- quote_attribution: who said a famous quote
- quote_completion: complete a partial quote
- quote_verbatim: short exact famous quote
- theme_identifier: a major theme
- setting: where/when the story is set
- title_from_quote: which book a quote comes from
- cultural_trivia: commonly known cultural fact about the book

Target 20–40 recall items. Include alternate_answers (distractors) for: author, major_character, quote_attribution, title_from_quote, publication_century. These are used for multiple-choice presentation.

Importance levels:
- iconic: the most culturally remembered (author, protagonist, famous opening line)
- strong: significant but not iconic
- secondary: supplementary, easily overlooked`

export function buildUserPrompt(
  title: string,
  author: string,
  metadata: { synopsis?: string; publication_year?: number; tradition?: string }
): string {
  let prompt = `Generate a literary memory profile for: "${title}" by ${author}.`
  if (metadata.publication_year) prompt += `\nFirst published: ${metadata.publication_year}`
  if (metadata.tradition) prompt += `\nLiterary tradition: ${metadata.tradition}`
  if (metadata.synopsis) prompt += `\nContext: ${metadata.synopsis}`
  return prompt
}
```

- [ ] **Step 2: Write generation function**

```ts
// literary-memory/lib/ai/generate.ts
import Anthropic from '@anthropic-ai/sdk'
import { validateAIOutput } from './validate'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt'
import type { AIGenerationOutput } from '@/types'

const client = new Anthropic()

export async function generateMemoryProfile(
  title: string,
  author: string,
  metadata: { synopsis?: string; publication_year?: number; tradition?: string }
): Promise<AIGenerationOutput> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(title, author, metadata) }
    ],
  })

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { text: string }).text)
    .join('')

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  const raw = JSON.parse(cleaned)
  return validateAIOutput(raw)
}
```

- [ ] **Step 3: Commit**

```bash
git add literary-memory/lib/ai/
git commit -m "feat: add AI generation pipeline with Anthropic SDK"
```

---

## Task 11: Import Server Action + Page

**Files:**
- Create: `literary-memory/actions/import.ts`
- Create: `literary-memory/app/(protected)/import/page.tsx`

- [ ] **Step 1: Write import server action**

```ts
// literary-memory/actions/import.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { fetchOpenLibraryMetadata } from '@/lib/metadata/openlibrary'
import { generateMemoryProfile } from '@/lib/ai/generate'
import { redirect } from 'next/navigation'

export async function importBook(formData: FormData) {
  const title = (formData.get('title') as string).trim()
  const authorInput = (formData.get('author') as string | null)?.trim() || undefined

  if (!title) throw new Error('Title is required')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Resolve canonical metadata via OpenLibrary
  const meta = await fetchOpenLibraryMetadata(title, authorInput)
  const resolvedTitle = meta?.title ?? title
  const resolvedAuthor = meta?.author ?? authorInput ?? 'Unknown'
  const publicationYear = meta?.publication_year ?? null
  const publicationCentury = meta?.publication_century ?? 'Unknown century'

  // Generate AI memory profile
  const profile = await generateMemoryProfile(resolvedTitle, resolvedAuthor, {
    publication_year: publicationYear ?? undefined,
  })

  // Insert book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      user_id: user.id,
      title: resolvedTitle,
      author: resolvedAuthor,
      publication_year: publicationYear,
      publication_century: publicationCentury,
      memory_anchors: profile.memory_anchors,
    })
    .select('id')
    .single()

  if (bookError || !book) throw new Error(`Failed to insert book: ${bookError?.message}`)

  // Insert recall items
  const recallRows = profile.recall_items.map(item => ({
    user_id: user.id,
    book_id: book.id,
    type: item.type,
    importance: item.importance,
    prompt: item.prompt,
    answer: item.answer,
    alternate_answers: item.alternate_answers ? item.alternate_answers : null,
  }))

  const { error: itemsError } = await supabase.from('recall_items').insert(recallRows)
  if (itemsError) throw new Error(`Failed to insert recall items: ${itemsError.message}`)

  redirect(`/books/${book.id}`)
}
```

- [ ] **Step 2: Write import page**

```tsx
// literary-memory/app/(protected)/import/page.tsx
import Container from '@/components/layout/Container'
import { importBook } from '@/actions/import'

export default function ImportPage() {
  return (
    <Container>
      <h1 className="font-serif text-3xl text-neutral-100 mb-2">Add a Book</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Takes 15–30 seconds while we build your memory profile.
      </p>
      <form action={importBook} className="flex flex-col gap-5 max-w-sm">
        <div>
          <label htmlFor="title" className="block text-sm text-neutral-400 mb-1">Title</label>
          <input
            id="title"
            name="title"
            required
            placeholder="Crime and Punishment"
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm text-neutral-400 mb-1">
            Author <span className="text-neutral-600">(optional — helps disambiguation)</span>
          </label>
          <input
            id="author"
            name="author"
            placeholder="Fyodor Dostoevsky"
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <button
          type="submit"
          className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors"
        >
          Import book
        </button>
      </form>
    </Container>
  )
}
```

- [ ] **Step 3: Test import end-to-end**

```bash
npm run dev
```
Navigate to /import, enter "Crime and Punishment" by "Fyodor Dostoevsky", submit. Verify:
- Page waits while AI generates (~15–30s)
- Redirects to /books/[new-id]
- Supabase `books` table has new row with memory_anchors
- Supabase `recall_items` table has 20–40 rows for the book

- [ ] **Step 4: Commit**

```bash
git add literary-memory/actions/import.ts literary-memory/app/(protected)/import/
git commit -m "feat: add book import with OpenLibrary metadata and AI generation"
```

---

## Task 12: Books Library Page

**Files:**
- Create: `literary-memory/components/books/BookListItem.tsx`
- Create: `literary-memory/app/(protected)/books/page.tsx`

- [ ] **Step 1: Write BookListItem**

```tsx
// literary-memory/components/books/BookListItem.tsx
import Link from 'next/link'
import type { Book, RecallItem } from '@/types'

interface Props {
  book: Book
  items: RecallItem[]
}

export default function BookListItem({ book, items }: Props) {
  const total = items.length
  const weak = items.filter(i => i.mastery === 'unfamiliar' || i.mastery === 'learning').length

  return (
    <Link
      href={`/books/${book.id}`}
      className="block py-4 border-b border-neutral-800 hover:border-neutral-600 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <span className="font-serif text-lg text-neutral-100 group-hover:text-white transition-colors">
            {book.title}
          </span>
          <span className="text-neutral-500 ml-3 text-sm">{book.author}</span>
        </div>
        <span className="text-xs text-neutral-600 shrink-0">
          {total} items{weak > 0 ? ` · ${weak} weak` : ''}
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Write books page**

```tsx
// literary-memory/app/(protected)/books/page.tsx
import { createClient } from '@/lib/supabase/server'
import Container from '@/components/layout/Container'
import BookListItem from '@/components/books/BookListItem'
import Link from 'next/link'
import type { Book, RecallItem } from '@/types'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: books }, { data: items }] = await Promise.all([
    supabase.from('books').select('*').eq('user_id', user!.id).order('title'),
    supabase.from('recall_items').select('id,book_id,mastery').eq('user_id', user!.id),
  ])

  if (!books?.length) {
    return (
      <Container>
        <p className="text-neutral-400 mb-3">No books yet.</p>
        <Link href="/import" className="text-neutral-300 underline underline-offset-2">
          Add your first book
        </Link>
      </Container>
    )
  }

  const itemsByBook = new Map<string, RecallItem[]>()
  for (const item of (items ?? []) as RecallItem[]) {
    const arr = itemsByBook.get(item.book_id) ?? []
    arr.push(item)
    itemsByBook.set(item.book_id, arr)
  }

  return (
    <Container>
      <h1 className="font-serif text-3xl text-neutral-100 mb-8">Library</h1>
      <div>
        {(books as Book[]).map(book => (
          <BookListItem
            key={book.id}
            book={book}
            items={itemsByBook.get(book.id) ?? []}
          />
        ))}
      </div>
    </Container>
  )
}
```

- [ ] **Step 3: Verify**

Navigate to /books — imported books should appear with item counts.

- [ ] **Step 4: Commit**

```bash
git add literary-memory/components/books/BookListItem.tsx literary-memory/app/(protected)/books/page.tsx
git commit -m "feat: add library page with book list and weak item counts"
```

---

## Task 13: Session Server Actions

**Files:**
- Create: `literary-memory/actions/session.ts`

- [ ] **Step 1: Write session actions**

```ts
// literary-memory/actions/session.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { selectSessionItems } from '@/lib/scheduler'
import { transitionMastery, computeNextDue, quoteMatches, normaliseText } from '@/lib/grader'
import { revalidatePath } from 'next/cache'
import type { Book, RecallItem, SessionItem, MasteryState, ImportanceLevel } from '@/types'

const QUOTE_TYPES = new Set(['quote_verbatim', 'quote_completion', 'opening_line'])

export async function getSessionItems(count = 10): Promise<SessionItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: items }, { data: books }] = await Promise.all([
    supabase.from('recall_items').select('*').eq('user_id', user.id),
    supabase.from('books').select('*').eq('user_id', user.id),
  ])

  if (!items || !books) return []
  const bookMap = new Map((books as Book[]).map(b => [b.id, b]))
  return selectSessionItems(items as RecallItem[], bookMap, { count })
}

export async function submitAnswer(
  itemId: string,
  answer: string
): Promise<{ correct: boolean; correctAnswer: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: item } = await supabase
    .from('recall_items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single()

  if (!item) throw new Error('Item not found')
  const ri = item as RecallItem

  const isQuote = QUOTE_TYPES.has(ri.type)
  const correct = isQuote
    ? quoteMatches(answer, ri.answer)
    : normaliseText(answer) === normaliseText(ri.answer) ||
      (ri.alternate_answers ?? []).some(alt => normaliseText(answer) === normaliseText(alt))

  const { mastery: newMastery, consecutiveCorrect, consecutiveWrong } =
    transitionMastery(
      ri.mastery as MasteryState,
      correct,
      ri.consecutive_correct,
      ri.consecutive_wrong
    )

  const nextDue = computeNextDue(newMastery, ri.importance as ImportanceLevel, correct)

  await supabase.from('recall_items').update({
    mastery: newMastery,
    consecutive_correct: consecutiveCorrect,
    consecutive_wrong: consecutiveWrong,
    times_seen: ri.times_seen + 1,
    times_correct: correct ? ri.times_correct + 1 : ri.times_correct,
    last_seen_at: new Date().toISOString(),
    next_due_at: nextDue.toISOString(),
  }).eq('id', itemId)

  revalidatePath('/dashboard')

  return { correct, correctAnswer: ri.answer }
}
```

- [ ] **Step 2: Commit**

```bash
git add literary-memory/actions/session.ts
git commit -m "feat: add session server actions (start, submit with grading)"
```

---

## Task 14: Session UI Components

**Files:**
- Create: `literary-memory/components/session/PromptCard.tsx`
- Create: `literary-memory/components/session/AnswerInput.tsx`
- Create: `literary-memory/components/session/GradeReveal.tsx`
- Create: `literary-memory/components/session/SessionEnd.tsx`

- [ ] **Step 1: Write PromptCard**

```tsx
// literary-memory/components/session/PromptCard.tsx
import type { RecallItem, Book } from '@/types'

export default function PromptCard({ item, book }: { item: RecallItem; book: Book }) {
  return (
    <div className="mb-8">
      <p className="text-xs text-neutral-500 uppercase tracking-widest mb-5">
        {book.title} · {book.author}
      </p>
      <p className="font-serif text-2xl text-neutral-100 leading-relaxed">
        {item.prompt}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Write AnswerInput**

Selectable types (author, major_character, quote_attribution, publication_century) use multiple choice when alternate_answers present. title_from_quote uses a book select. Everything else uses free text.

```tsx
// literary-memory/components/session/AnswerInput.tsx
'use client'
import { useState } from 'react'
import type { RecallItem } from '@/types'

const SELECTABLE_TYPES = new Set([
  'author', 'major_character', 'quote_attribution', 'publication_century',
])

interface Props {
  item: RecallItem
  allBooks: Array<{ id: string; title: string }>
  onSubmit: (answer: string) => void
  disabled: boolean
}

export default function AnswerInput({ item, allBooks, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value)
  }

  if (item.type === 'title_from_quote') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={disabled}
          className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 focus:outline-none focus:border-neutral-500"
        >
          <option value="">Select a book…</option>
          {allBooks.map(b => (
            <option key={b.id} value={b.title}>{b.title}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={disabled || !value}
          className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors disabled:opacity-40"
        >
          Submit
        </button>
      </form>
    )
  }

  if (item.alternate_answers?.length && SELECTABLE_TYPES.has(item.type)) {
    const options = [item.answer, ...item.alternate_answers].sort(() => Math.random() - 0.5)
    return (
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => !disabled && onSubmit(opt)}
            disabled={disabled}
            className="text-left px-4 py-3 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-200 transition-colors disabled:opacity-40 font-serif"
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder="Your answer…"
        className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none font-serif text-lg"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors disabled:opacity-40"
      >
        Submit
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Write GradeReveal**

```tsx
// literary-memory/components/session/GradeReveal.tsx
interface Props {
  correct: boolean
  correctAnswer: string
  onNext: () => void
  isLast: boolean
}

export default function GradeReveal({ correct, correctAnswer, onNext, isLast }: Props) {
  return (
    <div className="mt-8 pt-8 border-t border-neutral-800">
      <p className={`text-sm font-medium mb-3 ${correct ? 'text-neutral-300' : 'text-neutral-500'}`}>
        {correct ? '✓' : '✗'}
      </p>
      {!correct && (
        <p className="font-serif text-xl text-neutral-300 mb-5 leading-relaxed">
          {correctAnswer}
        </p>
      )}
      <button
        onClick={onNext}
        className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
      >
        {isLast ? 'Finish' : 'Next →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write SessionEnd**

```tsx
// literary-memory/components/session/SessionEnd.tsx
import Link from 'next/link'

export default function SessionEnd({ recalled, missed }: { recalled: number; missed: number }) {
  return (
    <div className="py-16 text-center">
      <p className="font-serif text-3xl text-neutral-300">
        {recalled} recalled · {missed} missed
      </p>
      <div className="mt-10 flex gap-6 justify-center">
        <Link href="/session" className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors">
          Another session
        </Link>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add literary-memory/components/session/
git commit -m "feat: add session UI components (prompt, input, grade, end)"
```

---

## Task 15: Session Page

**Files:**
- Create: `literary-memory/app/(protected)/session/page.tsx`
- Create: `literary-memory/app/(protected)/session/SessionRunner.tsx`

- [ ] **Step 1: Write session page (server component)**

```tsx
// literary-memory/app/(protected)/session/page.tsx
import { createClient } from '@/lib/supabase/server'
import { selectSessionItems, isDue } from '@/lib/scheduler'
import Container from '@/components/layout/Container'
import SessionRunner from './SessionRunner'
import Link from 'next/link'
import type { Book, RecallItem } from '@/types'

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>
}) {
  const { force } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: items }, { data: books }] = await Promise.all([
    supabase.from('recall_items').select('*').eq('user_id', user!.id),
    supabase.from('books').select('*').eq('user_id', user!.id),
  ])

  if (!items?.length) {
    return (
      <Container>
        <p className="text-neutral-400 mb-3">No recall items yet.</p>
        <Link href="/import" className="text-neutral-300 underline underline-offset-2">Add a book</Link>
      </Container>
    )
  }

  const bookMap = new Map((books as Book[]).map(b => [b.id, b]))
  const hasDue = (items as RecallItem[]).some(isDue)

  if (!hasDue && !force) {
    return (
      <Container>
        <p className="font-serif text-2xl text-neutral-400 mb-6">You&apos;re caught up.</p>
        <Link
          href="/session?force=1"
          className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
        >
          Start a session anyway →
        </Link>
      </Container>
    )
  }

  const sessionItems = selectSessionItems(items as RecallItem[], bookMap, { count: 10 })

  return (
    <Container>
      <SessionRunner items={sessionItems} allBooks={books as Book[]} />
    </Container>
  )
}
```

- [ ] **Step 2: Write SessionRunner client component**

```tsx
// literary-memory/app/(protected)/session/SessionRunner.tsx
'use client'
import { useState } from 'react'
import PromptCard from '@/components/session/PromptCard'
import AnswerInput from '@/components/session/AnswerInput'
import GradeReveal from '@/components/session/GradeReveal'
import SessionEnd from '@/components/session/SessionEnd'
import { submitAnswer } from '@/actions/session'
import type { SessionItem, Book } from '@/types'

interface Props {
  items: SessionItem[]
  allBooks: Book[]
}

export default function SessionRunner({ items, allBooks }: Props) {
  const [index, setIndex] = useState(0)
  const [grade, setGrade] = useState<{ correct: boolean; correctAnswer: string } | null>(null)
  const [recalled, setRecalled] = useState(0)
  const [missed, setMissed] = useState(0)
  const [done, setDone] = useState(false)

  if (done) {
    return <SessionEnd recalled={recalled} missed={missed} />
  }

  const current = items[index]

  async function handleAnswer(answer: string) {
    const result = await submitAnswer(current.recallItem.id, answer)
    setGrade(result)
    if (result.correct) setRecalled(r => r + 1)
    else setMissed(m => m + 1)
  }

  function handleNext() {
    if (index + 1 >= items.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setGrade(null)
    }
  }

  return (
    <div>
      <PromptCard item={current.recallItem} book={current.book} />
      <AnswerInput
        item={current.recallItem}
        allBooks={allBooks}
        onSubmit={handleAnswer}
        disabled={!!grade}
      />
      {grade && (
        <GradeReveal
          correct={grade.correct}
          correctAnswer={grade.correctAnswer}
          onNext={handleNext}
          isLast={index + 1 >= items.length}
        />
      )}
      <p className="text-xs text-neutral-700 mt-12">{index + 1} / {items.length}</p>
    </div>
  )
}
```

- [ ] **Step 3: Verify full session flow**

Navigate to /session. Answer all questions. Verify:
- Grade reveals after each answer
- "12 recalled · 3 missed" end screen shows correct counts
- Supabase `recall_items` rows updated (mastery, consecutive_correct, next_due_at)

- [ ] **Step 4: Commit**

```bash
git add literary-memory/app/(protected)/session/
git commit -m "feat: add interactive recall session page with server-side item selection"
```

---

## Task 16: Favourite Quotes Actions

**Files:**
- Create: `literary-memory/actions/quotes.ts`

- [ ] **Step 1: Write quote actions**

```ts
// literary-memory/actions/quotes.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { quoteMatches } from '@/lib/grader'
import type { FavoriteQuote } from '@/types'

export async function addFavoriteQuote(bookId: string, quoteText: string, sourceLocation?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('favorite_quotes').upsert({
    user_id: user.id,
    book_id: bookId,
    quote_text: quoteText.trim(),
    source_location: sourceLocation ?? null,
    memorization_stage: 1,
  }, { onConflict: 'user_id,quote_text', ignoreDuplicates: true })

  revalidatePath(`/books/${bookId}`)
}

export async function submitQuoteAnswer(
  quoteId: string,
  answer: string
): Promise<{ correct: boolean; correctAnswer: string; newStage: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: quote } = await supabase
    .from('favorite_quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single()

  if (!quote) throw new Error('Quote not found')
  const fq = quote as FavoriteQuote

  const correct = quoteMatches(answer, fq.quote_text)

  const newConsecCorrect = correct ? fq.consecutive_correct + 1 : 0
  const newConsecWrong = correct ? 0 : fq.consecutive_wrong + 1

  let newStage = fq.memorization_stage
  if (correct && newConsecCorrect >= 3) {
    newStage = Math.min(4, fq.memorization_stage + 1)
  } else if (!correct && newConsecWrong >= 2) {
    newStage = Math.max(1, fq.memorization_stage - 1)
  }

  const nextDue = new Date()
  nextDue.setDate(nextDue.getDate() + (correct ? 3 : 1))

  await supabase.from('favorite_quotes').update({
    memorization_stage: newStage,
    consecutive_correct: newConsecCorrect,
    consecutive_wrong: newConsecWrong,
    last_seen_at: new Date().toISOString(),
    next_due_at: nextDue.toISOString(),
  }).eq('id', quoteId)

  return { correct, correctAnswer: fq.quote_text, newStage }
}
```

- [ ] **Step 2: Commit**

```bash
git add literary-memory/actions/quotes.ts
git commit -m "feat: add favourite quote actions with 4-stage progression"
```

---

## Task 17: Book Profile Page

**Files:**
- Create: `literary-memory/components/books/MemoryAnchors.tsx`
- Create: `literary-memory/components/books/WeakAreas.tsx`
- Create: `literary-memory/components/books/FavoriteQuotesSection.tsx`
- Create: `literary-memory/app/(protected)/books/[id]/page.tsx`

- [ ] **Step 1: Write MemoryAnchors**

```tsx
// literary-memory/components/books/MemoryAnchors.tsx
export default function MemoryAnchors({ anchors }: { anchors: string[] }) {
  if (!anchors.length) return null
  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Memory Anchors</h2>
      <ul className="space-y-1">
        {anchors.map((anchor, i) => (
          <li key={i} className="font-serif text-lg text-neutral-300">— {anchor}</li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Write WeakAreas**

```tsx
// literary-memory/components/books/WeakAreas.tsx
import type { RecallItem, RecallType } from '@/types'

const TYPE_LABELS: Record<RecallType, string> = {
  author: 'Authorship',
  publication_century: 'Era',
  opening_line: 'Opening line',
  major_character: 'Characters',
  character_relationship: 'Relationships',
  quote_attribution: 'Quote attribution',
  quote_completion: 'Quote completion',
  quote_verbatim: 'Verbatim recall',
  theme_identifier: 'Themes',
  setting: 'Setting',
  title_from_quote: 'Title identification',
  cultural_trivia: 'Cultural context',
}

export default function WeakAreas({ items }: { items: RecallItem[] }) {
  const weakByType = new Map<RecallType, number>()
  for (const item of items) {
    if (item.mastery === 'unfamiliar' || item.mastery === 'learning') {
      weakByType.set(item.type, (weakByType.get(item.type) ?? 0) + 1)
    }
  }

  const weak = [...weakByType.entries()].sort((a, b) => b[1] - a[1])
  if (!weak.length) return null

  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Weak Areas</h2>
      <ul className="space-y-1">
        {weak.map(([type, count]) => (
          <li key={type} className="text-neutral-400 text-sm">
            {TYPE_LABELS[type]}
            <span className="text-neutral-600 ml-2">({count})</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Write FavoriteQuotesSection**

```tsx
// literary-memory/components/books/FavoriteQuotesSection.tsx
import type { FavoriteQuote } from '@/types'

const STAGE_LABELS = ['', 'Attribution', 'Guided recall', 'Short production', 'Verbatim']

export default function FavoriteQuotesSection({ quotes }: { quotes: FavoriteQuote[] }) {
  if (!quotes.length) return null
  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Favourite Quotes</h2>
      <div className="space-y-6">
        {quotes.map(q => (
          <div key={q.id} className="border-l-2 border-neutral-800 pl-4">
            <p className="font-serif text-neutral-300 leading-relaxed text-lg">{q.quote_text}</p>
            {q.source_location && (
              <p className="text-xs text-neutral-600 mt-1">{q.source_location}</p>
            )}
            <p className="text-xs text-neutral-700 mt-1">
              Stage {q.memorization_stage}: {STAGE_LABELS[q.memorization_stage]}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Write book profile page**

```tsx
// literary-memory/app/(protected)/books/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Container from '@/components/layout/Container'
import MemoryAnchors from '@/components/books/MemoryAnchors'
import WeakAreas from '@/components/books/WeakAreas'
import FavoriteQuotesSection from '@/components/books/FavoriteQuotesSection'
import Link from 'next/link'
import type { Book, RecallItem, FavoriteQuote } from '@/types'

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: book }, { data: items }, { data: quotes }] = await Promise.all([
    supabase.from('books').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('recall_items').select('*').eq('book_id', id).eq('user_id', user!.id),
    supabase.from('favorite_quotes').select('*').eq('book_id', id).eq('user_id', user!.id).order('created_at'),
  ])

  if (!book) notFound()

  const b = book as Book
  const ri = (items ?? []) as RecallItem[]
  const fq = (quotes ?? []) as FavoriteQuote[]

  const total = ri.length
  const mastered = ri.filter(i => i.mastery === 'mastered').length

  return (
    <Container>
      <div className="mb-10">
        <h1 className="font-serif text-4xl text-neutral-100 leading-tight">{b.title}</h1>
        <p className="text-neutral-400 mt-2">{b.author} · {b.publication_century}</p>
        {total > 0 && (
          <p className="text-xs text-neutral-600 mt-2">
            {mastered} of {total} mastered
          </p>
        )}
      </div>

      <MemoryAnchors anchors={(b.memory_anchors as string[]) ?? []} />
      <WeakAreas items={ri} />
      <FavoriteQuotesSection quotes={fq} />

      <div className="mt-12 pt-6 border-t border-neutral-900">
        <Link
          href={`/session?book=${b.id}`}
          className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
        >
          Recall this book →
        </Link>
      </div>
    </Container>
  )
}
```

- [ ] **Step 5: Verify book profile renders**

Navigate to /books/[id] after importing a book. Should show memory anchors, weak areas (all items start unfamiliar), and any pinned quotes.

- [ ] **Step 6: Commit**

```bash
git add literary-memory/components/books/ literary-memory/app/(protected)/books/[id]/
git commit -m "feat: add book profile page with anchors, weak areas, and quotes"
```

---

## Task 18: Dashboard

**Files:**
- Create: `literary-memory/app/(protected)/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard**

```tsx
// literary-memory/app/(protected)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Container from '@/components/layout/Container'
import Link from 'next/link'
import { isDue } from '@/lib/scheduler'
import type { RecallItem, Book } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: items }, { data: books }] = await Promise.all([
    supabase.from('recall_items').select('id,next_due_at').eq('user_id', user!.id),
    supabase.from('books').select('id,title,author').eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(5),
  ])

  const ri = (items ?? []) as Pick<RecallItem, 'id' | 'next_due_at'>[]
  const dueCount = ri.filter(i => isDue(i as RecallItem)).length

  return (
    <Container>
      <div className="mb-14">
        {dueCount > 0 ? (
          <>
            <p className="font-serif text-6xl text-neutral-100 mb-2">{dueCount}</p>
            <p className="text-neutral-500 mb-8">items due for recall</p>
            <Link
              href="/session"
              className="inline-block bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-6 py-3 transition-colors"
            >
              Begin recall
            </Link>
          </>
        ) : (
          <>
            <p className="font-serif text-2xl text-neutral-500 mb-4">You&apos;re caught up.</p>
            <Link
              href="/session?force=1"
              className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
            >
              Start a session anyway →
            </Link>
          </>
        )}
      </div>

      {(books as Book[]).length > 0 && (
        <div>
          <p className="text-xs text-neutral-600 uppercase tracking-widest mb-4">Recently Added</p>
          <div className="space-y-2">
            {(books as Book[]).map(book => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="block font-serif text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                {book.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!(books as Book[]).length && (
        <Link href="/import" className="text-neutral-500 hover:text-neutral-100 transition-colors underline underline-offset-2">
          Add your first book
        </Link>
      )}
    </Container>
  )
}
```

- [ ] **Step 2: Verify dashboard**

Dashboard should show due count, "Begin recall" CTA, and recently added books.

- [ ] **Step 3: Commit**

```bash
git add literary-memory/app/(protected)/dashboard/
git commit -m "feat: add dashboard with due count and recently added books"
```

---

## Task 19: Settings — Favourite Quotes Markdown Import

**Files:**
- Create: `literary-memory/actions/settings.ts`
- Create: `literary-memory/app/(protected)/settings/page.tsx`

- [ ] **Step 1: Write settings server action**

Format of `favourite_quotes.md`:
```
## Book Title
Quote text on one line.
Another quote here.

## Another Book Title
A quote from this book.
```

```ts
// literary-memory/actions/settings.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ParsedQuote {
  bookTitle: string
  quoteText: string
}

function parseFavoriteQuotesMarkdown(markdown: string): ParsedQuote[] {
  const results: ParsedQuote[] = []
  let currentBook = ''

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      currentBook = trimmed.slice(3).trim()
    } else if (trimmed && currentBook) {
      results.push({ bookTitle: currentBook, quoteText: trimmed })
    }
  }

  return results
}

export async function importFavoriteQuotes(formData: FormData) {
  const markdown = formData.get('markdown') as string
  if (!markdown?.trim()) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const parsed = parseFavoriteQuotesMarkdown(markdown)
  if (!parsed.length) return

  const { data: books } = await supabase
    .from('books')
    .select('id, title')
    .eq('user_id', user.id)

  const bookMap = new Map((books ?? []).map(b => [b.title.toLowerCase().trim(), b.id]))

  const rows = parsed
    .map(({ bookTitle, quoteText }) => {
      const bookId = bookMap.get(bookTitle.toLowerCase().trim())
      if (!bookId) return null
      return {
        user_id: user.id,
        book_id: bookId,
        quote_text: quoteText,
        memorization_stage: 1,
        consecutive_correct: 0,
        consecutive_wrong: 0,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (!rows.length) return

  await supabase.from('favorite_quotes').upsert(rows, {
    onConflict: 'user_id,quote_text',
    ignoreDuplicates: true,
  })

  revalidatePath('/settings')
}
```

- [ ] **Step 2: Write settings page**

```tsx
// literary-memory/app/(protected)/settings/page.tsx
import Container from '@/components/layout/Container'
import { importFavoriteQuotes } from '@/actions/settings'

export default function SettingsPage() {
  return (
    <Container>
      <h1 className="font-serif text-3xl text-neutral-100 mb-10">Settings</h1>

      <section>
        <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">
          Import Favourite Quotes
        </h2>
        <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
          Paste your <code className="text-neutral-400">favourite_quotes.md</code> content.
          Use <code className="text-neutral-400">## Book Title</code> headers with one quote per line.
          Existing quotes are preserved — re-importing is safe.
          Book titles must match exactly what you imported.
        </p>
        <form action={importFavoriteQuotes} className="flex flex-col gap-4">
          <textarea
            name="markdown"
            rows={14}
            placeholder={'## Pride and Prejudice\nIt is a truth universally acknowledged...\n\n## Wuthering Heights\nWhatever our souls are made of...'}
            className="bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 font-mono text-sm resize-y"
          />
          <button
            type="submit"
            className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors"
          >
            Import quotes
          </button>
        </form>
      </section>
    </Container>
  )
}
```

- [ ] **Step 3: Verify settings import**

Navigate to /settings. Paste markdown with a `## Book Title` matching an imported book. Submit. Check Supabase `favorite_quotes` table — rows should appear. Re-submit same markdown — no duplicates. Navigate to /books/[id] — quotes appear in FavoriteQuotesSection.

- [ ] **Step 4: Commit**

```bash
git add literary-memory/actions/settings.ts literary-memory/app/(protected)/settings/
git commit -m "feat: add settings page with favourite quotes markdown import"
```

---

## Task 20: Add Quote from Book Page

**Files:**
- Create: `literary-memory/components/books/AddQuoteForm.tsx`
- Modify: `literary-memory/app/(protected)/books/[id]/page.tsx`

- [ ] **Step 1: Write AddQuoteForm client component**

```tsx
// literary-memory/components/books/AddQuoteForm.tsx
'use client'
import { useState } from 'react'
import { addFavoriteQuote } from '@/actions/quotes'

interface Props {
  bookId: string
}

export default function AddQuoteForm({ bookId }: Props) {
  const [open, setOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [sourceLocation, setSourceLocation] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quoteText.trim()) return
    setPending(true)
    await addFavoriteQuote(bookId, quoteText, sourceLocation || undefined)
    setQuoteText('')
    setSourceLocation('')
    setOpen(false)
    setPending(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
      >
        + Pin a quote
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
      <textarea
        value={quoteText}
        onChange={e => setQuoteText(e.target.value)}
        rows={3}
        placeholder="Quote text…"
        required
        disabled={pending}
        className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-serif text-lg resize-none"
      />
      <input
        value={sourceLocation}
        onChange={e => setSourceLocation(e.target.value)}
        placeholder="Source (optional — e.g. Chapter 3)"
        disabled={pending}
        className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 text-sm"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !quoteText.trim()}
          className="text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Pin quote'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Add AddQuoteForm to book profile page**

In `literary-memory/app/(protected)/books/[id]/page.tsx`, import `AddQuoteForm` and add it below `FavoriteQuotesSection`:

```tsx
import AddQuoteForm from '@/components/books/AddQuoteForm'
```

Replace the closing `</Container>` block (the one with the "Recall this book" link) with:

```tsx
      <FavoriteQuotesSection quotes={fq} />

      <section className="mb-10">
        <AddQuoteForm bookId={b.id} />
      </section>

      <div className="mt-12 pt-6 border-t border-neutral-900">
        <Link
          href={`/session?book=${b.id}`}
          className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
        >
          Recall this book →
        </Link>
      </div>
    </Container>
```

- [ ] **Step 3: Verify**

Navigate to /books/[id]. Click "+ Pin a quote". Enter a quote and optional source. Submit. Verify:
- Form collapses after submit
- New quote appears in Favourite Quotes section (page refreshes via `revalidatePath`)
- Supabase `favorite_quotes` table has new row

- [ ] **Step 4: Commit**

```bash
git add literary-memory/components/books/AddQuoteForm.tsx literary-memory/app/(protected)/books/
git commit -m "feat: add quote pinning form on book profile page"
```

---

## Task 22: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
cd literary-memory && npx vitest run
```
Expected output: 4 test files, all pass. Example:
```
 ✓ __tests__/grader.test.ts (8 tests)
 ✓ __tests__/scheduler.test.ts (4 tests)
 ✓ __tests__/validate.test.ts (6 tests)
 ✓ __tests__/openlibrary.test.ts (5 tests)
```

- [ ] **Step 2: Fix any failures**

If any test fails, read the error message and fix the implementation. Do not modify tests to make them pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify all unit tests pass"
```

---

## Task 23: Vercel Deployment

- [ ] **Step 1: Install Vercel CLI if needed**

```bash
npm i -g vercel@latest
```

- [ ] **Step 2: Create Vercel project**

```bash
cd literary-memory
vercel
# Set root directory to "literary-memory"
# Framework: Next.js
```

- [ ] **Step 3: Add environment variables**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add ANTHROPIC_API_KEY production
```

- [ ] **Step 4: Configure Supabase auth redirect**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://<your-project>.vercel.app`
- Redirect URLs: add `https://<your-project>.vercel.app/auth/callback`

- [ ] **Step 5: Deploy to production**

```bash
vercel --prod
```
Expected: deployment URL returned.

- [ ] **Step 6: Verify production auth flow**

Visit production URL → /dashboard → /login → enter email → receive magic link → sign in → /dashboard loads.

- [ ] **Step 7: Commit**

```bash
cd ..
git add literary-memory/
git commit -m "feat: deploy literary memory app to Vercel"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Magic link auth | Task 5 |
| DB schema + enums + RLS | Task 3 |
| Supabase clients | Task 4 |
| Book import: metadata (OpenLibrary) | Task 9, 11 |
| Book import: AI generation (Anthropic) | Task 10, 11 |
| No review screen — activate immediately | Task 11 |
| Recall session (10 items, grade immediately) | Tasks 13–15 |
| Scheduler: due-first, importance weighting | Task 7 |
| Scheduler: avoid consecutive same-book | Task 7 |
| Grader: mastery transitions (consecutive model) | Task 6 |
| Grader: quote matching (token overlap) | Task 6 |
| Selectable vs free-text input types | Task 14 |
| title_from_quote uses book dropdown | Task 14 |
| Session end: counts only, no praise | Task 14 (SessionEnd) |
| FavoriteQuote 4-stage progression | Task 16 |
| Add quote from book profile page | Task 20 |
| FavoriteQuote: 3 correct → advance, 2 wrong → regress | Task 16 |
| Book profile: anchors, weak areas, quotes | Task 17 |
| Library: title + author + item counts | Task 12 |
| Dashboard: due count, recently added | Task 18 |
| Settings: markdown quote import (upsert) | Task 19 |
| Dark only | Tasks 5 (layout) |
| publication_century "Nth century" format | Task 9 |
| `consecutive_correct/wrong` on recall_items | Task 3 (schema) |
| `last_seen_at` + `next_due_at` on favorite_quotes | Task 3 (schema) |
| Vercel deployment | Task 21 |

### Placeholder Scan

No TBDs. No "similar to Task N" shortcuts. Every step includes code.

### Type Consistency

- `RecallItem.mastery` → typed as `MasteryState` everywhere; cast from Supabase string in server actions
- `grader.ts` exports `normaliseText`, `quoteMatches`, `transitionMastery`, `computeNextDue` — all imported in `actions/session.ts` and `actions/quotes.ts` by exact name
- `scheduler.ts` exports `isDue`, `selectSessionItems` — used in `dashboard/page.tsx` and `session/page.tsx`
- `SessionItem.recallItem` is non-optional (unlike earlier draft) — consistent with `SessionRunner.tsx` and `session/page.tsx`
- `alternate_answers` in `recall_items` table is `jsonb` — stored as array, read as `string[] | null`

---

Plan complete and saved to `docs/superpowers/plans/2026-05-14-literary-memory-app.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
