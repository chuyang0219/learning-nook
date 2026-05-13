# Literary Memory App — Technical Product Spec

## 1. Purpose

This document translates the product philosophy into a concrete engineering specification suitable for implementation with Claude Code.

The implementation should preserve the following priorities:

1. Active recall over passive review
2. Calm scholarly UX over gamified productivity
3. Literary memory over trivia accumulation
4. Long-term retention over completionism
5. Architectural simplicity over speculative extensibility

---

# 2. Core Architecture

## 2.1 Stack

### Frontend
- Next.js 15+
- App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- React Server Components where appropriate

### Backend
- Supabase
  - Postgres
  - Auth
  - Storage
  - Edge Functions optional

### Deployment
- Vercel

### AI Generation
- OpenAI or Anthropic API
- Generation only during import/editing workflows
- No AI chat functionality during normal usage

---

# 3. Application Structure

## 3.1 Route Map

```txt
/
/login
/dashboard
/session
/session/[mode]
/books
/books/[id]
/import
/settings
```

---

## 3.2 High-Level Flow

### Import Flow
1. User adds book
2. System resolves metadata
3. AI generates memory profile
4. User lightly reviews
5. Book enters recall rotation

### Recall Flow
1. Scheduler selects item
2. Prompt displayed
3. User submits answer
4. System grades
5. Scheduler updates state
6. Next prompt shown

---

# 4. Database Schema

## 4.1 users

Managed by Supabase Auth.

---

## 4.2 books

```sql
create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  title text not null,
  author text not null,

  publication_year integer,
  publication_century text,

  tradition text,
  language text,

  synopsis_short text,
  memory_anchors jsonb,

  cover_image_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Indexes:

```sql
create index books_user_id_idx on books(user_id);
```

---

## 4.3 recall_items

```sql
create type recall_type as enum (
  'author',
  'publication_century',
  'opening_line',
  'major_character',
  'character_relationship',
  'quote_attribution',
  'quote_completion',
  'quote_verbatim',
  'theme_identifier',
  'setting',
  'title_from_quote',
  'cultural_trivia'
);
```

```sql
create type importance_level as enum (
  'iconic',
  'strong',
  'secondary'
);
```

```sql
create type mastery_state as enum (
  'unfamiliar',
  'learning',
  'stable',
  'mastered'
);
```

```sql
create table recall_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,

  type recall_type not null,

  prompt text not null,
  answer text not null,

  alternate_answers jsonb,
  metadata jsonb,

  importance importance_level default 'strong',
  mastery mastery_state default 'unfamiliar',

  times_seen integer default 0,
  times_correct integer default 0,

  last_seen_at timestamptz,
  next_due_at timestamptz,

  created_at timestamptz default now()
);
```

Indexes:

```sql
create index recall_items_user_id_idx on recall_items(user_id);
create index recall_items_book_id_idx on recall_items(book_id);
create index recall_items_next_due_idx on recall_items(next_due_at);
```

---

## 4.4 favorite_quotes

```sql
create table favorite_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,

  quote_text text not null,
  source_location text,

  memorization_stage integer default 1,

  created_at timestamptz default now()
);
```

---

# 5. Row Level Security

Enable RLS on all tables.

Policies:
- users may only access their own content
- all queries filtered by auth.uid()

Example:

```sql
create policy "users own books"
on books
for all
using (auth.uid() = user_id);
```

---

# 6. Recall Scheduler

## 6.1 Philosophy

The scheduler should feel invisible.

The goal is not maximal spaced repetition optimization.
The goal is maintaining a living literary canon.

---

## 6.2 Scheduling Factors

Each item score depends on:

- importance
- mastery
- recency
- correctness history
- quote difficulty

---

## 6.3 Due Logic

### Wrong Answers
Resurface quickly.

Suggested intervals:
- 10 minutes
- 1 day
- 3 days

### Correct Answers
Gradually expand.

Suggested intervals:
- 1 day
- 3 days
- 1 week
- 1 month
- 3 months

Mastered items never disappear permanently.

---

## 6.4 Importance Weighting

### Iconic
Always resurfaced occasionally.

### Strong
Normal decay.

### Secondary
Can become relatively infrequent.

---

## 6.5 Session Composition

Mixed sessions should:
- prioritize due items
- maintain category variety
- avoid excessive repetition
- avoid consecutive prompts from same book whenever possible

Soft randomness is preferred.

---

# 7. Quote Matching Logic

## 7.1 Matching Strategy

Use normalized token comparison.

Normalize:
- whitespace
- punctuation
- capitalization

Allow:
- minor token deviations
- small omitted filler words

Do not allow:
- semantic paraphrase
- substantially altered wording

---

## 7.2 Suggested Thresholds

### Short Quotes
~95% similarity required.

### Longer Quotes
~90% similarity required.

---

## 7.3 Implementation Recommendation

Use:
- Levenshtein distance
- token overlap
- normalized strings

Avoid LLM grading.

---

# 8. AI Generation Pipeline

## 8.1 Generation Timing

Generation occurs:
- once during import
- optionally later during manual regeneration

No AI generation during sessions.

---

## 8.2 Metadata Sources

Use structured sources first:
- OpenLibrary
- Wikipedia
- Google Books optional

AI should generate:
- recall items
- memory anchors
- thematic identifiers
- quote candidates

AI should NOT invent canonical metadata.

---

## 8.3 Generation Constraints

The generator must optimize for:

> what a genuinely well-read person plausibly retains years later.

Avoid:
- obscure trivia
- fan-wiki detail
- overanalysis
- speculative symbolism
- exhaustive completeness

---

## 8.4 Recall Item Count

Target:
- 20–40 recall items per book

Distribution:

| Type | Suggested Count |
|---|---|
| Author | 1 |
| Opening line | 1 |
| Major characters | 3–5 |
| Relationships | 2–4 |
| Quote attribution | 4–8 |
| Themes | 2–4 |
| Setting/context | 1–3 |
| Cultural trivia | 2–5 |

---

## 8.5 AI Output Schema

Require strict JSON.

Example:

```json
{
  "memory_anchors": [
    "guilt and moral torment",
    "Petersburg isolation",
    "Raskolnikov",
    "utilitarian rationalization"
  ],
  "recall_items": [
    {
      "type": "author",
      "importance": "iconic",
      "prompt": "Who wrote Crime and Punishment?",
      "answer": "Fyodor Dostoevsky"
    }
  ]
}
```

---

# 9. Import Flow

## Step 1
User enters:
- title
- optional author

---

## Step 2
Backend resolves canonical metadata.

---

## Step 3
AI generation executes.

---

## Step 4
Temporary review screen.

User may:
- delete bad items
- edit awkward prompts
- pin favorite quotes

---

## Step 5
Book activated.

---

# 10. Frontend Information Architecture

## 10.1 Dashboard

Purpose:
- entry point
- current recall state
- quick actions

Sections:
- Continue Recall
- Recently Added
- Weak Areas
- Favorites

Keep visually sparse.

---

## 10.2 Session Screen

Primary app experience.

Structure:

```txt
[Prompt]

[input]

[Submit]
```

After grading:

```txt
[Result]
[Correct answer]
[Optional clarification]

[Next]
```

No dense statistics.

---

## 10.3 Book Page

Purpose:
- quick reference
- memory reinforcement

Sections:
- Header
- Memory anchors
- Favorite quotes
- Commonly remembered
- Weak areas

Not an encyclopedia page.

---

## 10.4 Import Page

Simple linear workflow.

Avoid wizard complexity.

---

# 11. UI System

## 11.1 Typography

Typography-first design.

Suggested pairing:
- serif headings
- clean sans body

Examples:
- Cormorant Garamond
- EB Garamond
- Inter

---

## 11.2 Layout

- spacious
- low-density
- centered reading column
- restrained use of cards

---

## 11.3 Motion

Subtle only.

Avoid:
- bouncing
- gamified celebration
- excessive animation

---

## 11.4 Color

Muted literary atmosphere.

Suggested:
- warm neutrals
- charcoal
- parchment tones
- dark mode prioritized

---

# 12. Session UX Flow

## Standard Flow

1. Prompt appears
2. User types answer
3. User submits
4. System grades
5. Reveal shown
6. Scheduling updated
7. Transition to next prompt

Transition cadence should feel calm but efficient.

---

# 13. State Management

Recommended:
- server components for data-heavy pages
- client state only for session interactions

Use:
- React Query or SWR optional
- minimal global state

Avoid premature abstraction.

---

# 14. API Structure

## Suggested Endpoints

```txt
/api/import-book
/api/generate-memory-profile
/api/session/start
/api/session/submit
/api/books/[id]
/api/quotes
```

Prefer server actions where practical.

---

# 15. Performance Goals

## Session Interactions
Should feel instant.

Target:
- sub-100ms local transitions

---

## Import Generation
Can tolerate latency.

Target:
- under 30 seconds

---

# 16. Anti-Goals

Do NOT implement:
- social systems
- discourse/forums
- achievement systems
- streaks
- leaderboards
- AI tutor/chat
- collaborative editing
- exhaustive analytics
- overcomplicated spaced repetition science

---

# 17. V1 Success Criteria

The app succeeds if:
- sessions feel intellectually satisfying
- recall improves over weeks/months
- users retain canonical literary memories
- quote memorization feels meaningful
- the product feels calm and serious

The app fails if it feels like:
- a trivia game
- school revision software
- a productivity dashboard
- a generic flashcard clone

---

# Claude Code Execution Plan

# 1. Overall Philosophy

Claude Code should prioritize:
- clarity
- restraint
- maintainability
- atmosphere
- simplicity

Avoid:
- premature abstractions
- excessive componentization
- speculative future systems
- overengineering

The implementation should feel deliberate and quiet.

---

# 2. Implementation Order

Strictly follow this order.

---

# Phase 1 — Project Setup

## Tasks

- Initialize Next.js app
- Configure TypeScript
- Install Tailwind
- Install shadcn/ui
- Configure Supabase client
- Configure auth
- Setup environment variables
- Configure deployment on Vercel

## Deliverable
Working authenticated shell app.

---

# Phase 2 — Database & Auth

## Tasks

- Create SQL schema
- Enable RLS
- Create policies
- Implement login/logout
- Create protected routes

## Deliverable
Authenticated user-specific data layer.

---

# Phase 3 — Book CRUD

## Tasks

- Add books page
- Add book creation flow
- Create book detail page
- Store metadata
- Add lightweight search

## Deliverable
Books can be added/viewed.

---

# Phase 4 — Import Pipeline

## Tasks

- Metadata lookup integration
- AI generation route
- Structured JSON validation
- Recall item insertion
- Import review screen

## Critical Requirement
Generation quality matters more than generation quantity.

## Deliverable
Books generate memory profiles.

---

# Phase 5 — Recall Engine

## Tasks

- Build scheduler
- Session generation
- Prompt renderer
- Answer submission
- Grading logic
- Due updates

## Critical Requirement
Sessions must feel smooth and calm.

## Deliverable
Working recall sessions.

---

# Phase 6 — Quote System

## Tasks

- Quote attribution prompts
- Quote completion prompts
- Favorite quote storage
- Verbatim matching
- Quote progression stages

## Critical Requirement
Do not make quote grading too lenient.

## Deliverable
Meaningful quote memorization workflow.

---

# Phase 7 — Book Memory Profiles

## Tasks

- Memory anchor rendering
- Favorite quotes section
- Weak areas section
- Commonly remembered section

## Critical Requirement
Avoid encyclopedia density.

## Deliverable
Elegant lightweight literary profiles.

---

# Phase 8 — UI Polish

## Tasks

- Typography refinement
- Motion refinement
- Dark mode polish
- Session pacing polish
- Responsive behavior

## Critical Requirement
Atmosphere matters.

## Deliverable
Cohesive literary product feel.

---

# 3. Prompt Engineering Rules

## AI Prompt Philosophy

Prompts should repeatedly reinforce:

> generate culturally meaningful literary memory, not trivia.

Include explicit instructions:
- avoid obscure details
- prioritize iconic associations
- avoid unsupported symbolism
- avoid overanalysis
- optimize for plausible long-term retention

---

# 4. UI Rules

Claude Code should:
- prefer whitespace
- avoid dashboard clutter
- avoid excessive icons
- avoid excessive cards
- prioritize readable typography

The product should feel:
- contemplative
- literary
- restrained

---

# 5. Component Strategy

Prefer:
- medium-sized pragmatic components

Avoid:
- hyper-granular component fragmentation
- abstract design systems too early

Suggested structure:

```txt
components/
  session/
  books/
  layout/
  ui/
```

---

# 6. Scheduler Rules

Keep scheduler understandable.

Do not implement:
- FSRS complexity
- probabilistic memory models
- excessive tuning systems

Use:
- weighted intervals
- importance modifiers
- lightweight decay

---

# 7. Design Guardrails

If a feature introduces:
- quiz app energy
- productivity software energy
- gamification
- excessive analytics

then reject or simplify it.

---

# 8. Code Quality Priorities

Prioritize:
1. readability
2. maintainability
3. product coherence
4. speed
5. extensibility

In that order.

---

# 9. Testing Priorities

Most important areas:

## High Priority
- scheduler correctness
- quote matching
- AI JSON validation
- RLS security

## Medium Priority
- responsive layout
- session transitions
- import edge cases

## Lower Priority
- advanced optimization

---

# 10. Final Implementation Standard

The implementation succeeds if the product feels like:

> a cultivated private literary memory practice.

It fails if it feels like:

> a literature quiz application.
