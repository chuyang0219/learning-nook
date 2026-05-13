# Product Vision

## Working Concept

A private literary memory system designed to preserve a living internal canon through structured active recall.

The app is not intended to teach literature, explain books, or replace reading. It exists to help the user retain and periodically revisit the culturally and personally meaningful memories associated with classic literary works.

The emotional target is:
- mentally sharpened
- culturally grounded
- intellectually satisfied

The app should feel:
- calm
- serious
- minimal
- literary
- reflective without becoming slow
- intellectually respectful
- anti-gamified

It should never feel like:
- a productivity dashboard
- a trivia game
- a school revision tool
- an AI chatbot
- an encyclopedia
- a social reading platform

The core interaction is active recall.

The app assumes the user has already read the books and wants to preserve:
- authorship
- cultural context
- major characters
- opening lines
- famous quotations
- memorable scenes
- thematic texture
- emotionally resonant memories
- “what this book is known for”

The system balances:
- canonical literary memory
and
- personal literary memory

equally.

---

# Literary Memory App — V1 Specification

# 1. Product Principles

## 1.1 Recall First
Every meaningful interaction should involve retrieval, not passive consumption.

The app tests memory before revealing information.

---

## 1.2 Literary Seriousness
The app should treat books as culturally meaningful works, not trivia objects.

Generated content should prioritize:
- culturally remembered details
- iconic associations
- memorable structure
- meaningful recall

Avoid:
- obscure minutiae
- fan wiki energy
- exhaustive completeness
- gimmicky questions

---

## 1.3 Calm Scholarly UX
The interface should feel:
- minimal
- spacious
- typography-forward
- atmospheric
- emotionally restrained

Avoid:
- streaks
- XP
- badges
- dopamine loops
- mascots
- loud success states

---

## 1.4 Memory Over Metadata
Books are represented as retained memory profiles, not encyclopedic entries.

The emphasis is:
- what remains in memory
- what culturally matters
- what personally resonated

---

## 1.5 Adaptive Retention
The system should:
- resurface weak memories more often
- preserve strong memories indefinitely at low frequency
- separate importance from mastery

---

# 2. Tech Stack

## Frontend
- Next.js (App Router)
- TypeScript
- TailwindCSS
- Vercel deployment

## Backend
- Supabase
  - Postgres
  - Auth
  - Storage
  - Edge Functions optional

## AI
Initial generation only.
No conversational AI during normal usage.

Recommended:
- OpenAI API or Anthropic API
- generation happens once per imported book

---

# 3. Core Entities

# 3.1 Book

```ts
Book {
  id: uuid
  user_id: uuid

  title: string
  author: string

  publication_year: number | null
  publication_century: string

  tradition: string | null
  language: string | null

  synopsis_short: string | null

  cover_image_url: string | null

  created_at: timestamp
  updated_at: timestamp
}
```

Books are lightweight containers.

They are not full literary encyclopedia pages.

---

# 3.2 Recall Item

```ts
RecallItem {
  id: uuid
  user_id: uuid
  book_id: uuid

  type: RecallType

  prompt: text
  answer: text

  alternate_answers: string[] | null

  metadata: jsonb

  importance: ImportanceLevel
  mastery_state: MasteryState

  times_seen: number
  times_correct: number
  last_seen_at: timestamp | null
  next_due_at: timestamp | null

  created_at: timestamp
}
```

---

# 3.3 Favorite Quote

```ts
FavoriteQuote {
  id: uuid
  user_id: uuid
  book_id: uuid

  quote_text: text

  source_location: string | null

  memorization_stage: number

  created_at: timestamp
}
```

---

# 4. Recall Types

V1 supported taxonomy:

```ts
type RecallType =
  | "author"
  | "publication_century"
  | "opening_line"
  | "major_character"
  | "character_relationship"
  | "quote_attribution"
  | "quote_completion"
  | "quote_verbatim"
  | "theme_identifier"
  | "setting"
  | "title_from_quote"
  | "cultural_trivia"
```

Taxonomy intentionally constrained.

No freeform essay prompts.

No scene reconstruction.

No subjective interpretation grading.

---

# 5. Importance System

Separate from mastery.

```ts
type ImportanceLevel =
  | "iconic"
  | "strong"
  | "secondary"
```

Examples:

## Iconic
- “Call me Ishmael.”
- Dostoevsky authored Crime and Punishment
- Raskolnikov

## Strong
- Sonia relationship details
- Petersburg setting

## Secondary
- lesser side characters
- exact publication year

Importance affects resurfacing frequency.

---

# 6. Mastery System

```ts
type MasteryState =
  | "unfamiliar"
  | "learning"
  | "stable"
  | "mastered"
```

Binary grading only:
- Correct
- Wrong

No visible “close enough” state.

Internally:
minor tolerance allowed for quote checking.

---

# 7. Quote Recall System

Quotes have separate progression logic.

## Stage 1 — Attribution Recognition
Identify:
- which book
- which author
- which character

May use multiple choice.

---

## Stage 2 — Guided Recall
Partial completion.

Example:

> “Whatever our souls are made of…”

---

## Stage 3 — Short Production
User types short exact quote segments.

---

## Stage 4 — Verbatim Recall
Favorites only.

Full exact typed recall.

Uses:
- punctuation normalization
- whitespace normalization
- small token tolerance

Should feel demanding but fair.

---

# 8. Scheduling Philosophy

Not strict Anki-style optimization.

The scheduler should feel invisible.

Goals:
- preserve literary memory long-term
- revisit weak areas
- maintain canonical familiarity indefinitely

Factors:
- correctness
- importance
- mastery
- recency
- quote difficulty

---

# 9. Session Design

## Session Feel
- contemplative but flowing
- minimal friction
- fast interaction loops

---

## Session Structure
Question stream model.

One recall prompt at a time.

No dense dashboarding.

---

## Session Modes (lightweight)

### General Recall
Mixed prompts.

### Quotes Only
All quote-related prompts.

### Favorites
Personal canon only.

### Recently Missed
Weak memories.

### By Book
Single-book focus.

### Short Session
~5 prompts.

### Long Session
~20 prompts.

---

# 10. Grading UX

After answering:

## Correct
Subtle positive confirmation.

## Wrong
Reveal answer cleanly.

Include tiny clarification if helpful.

Example:

> Cathy is Edgar Linton’s wife, not Heathcliff’s.

Never overly pedagogical.

---

# 11. Book Pages

Each book has a lightweight memory profile page.

Purpose:
- quick reference
- memory reinforcement
- progress overview

NOT:
- full synopsis replacement
- analysis page

---

## Book Page Sections

### Header
- title
- author
- era
- cover

### Memory Anchors
Auto-generated concise list.

Example:
- guilt and moral torment
- Petersburg isolation
- Raskolnikov
- utilitarian rationalization

Short only.

---

### Favorite Quotes
Pinned personal quotes.

---

### Commonly Remembered
Canonical memories associated with the book.

---

### Weak Areas
Recall categories frequently missed.

---

# 12. Import Flow

## Step 1
User adds:
- title
- optional author

---

## Step 2
System resolves canonical match.

Use:
- OpenLibrary
- Wikipedia metadata
- structured APIs

---

## Step 3
AI generates:
- recall items
- importance levels
- memory anchors
- quote candidates

Generation occurs once.

---

## Step 4
User lightweight review:
- remove bad items
- pin favorite quotes
- optionally edit

---

## Step 5
Book enters recall rotation.

---

# 13. AI Generation Rules

Critical section.

The generator should optimize for:

> “What would a genuinely well-read person plausibly retain years later?”

NOT:
- obscure literary trivia
- exhaustive completeness
- symbolic overanalysis
- undergraduate essay clichés

---

## Generation Heuristics

Prioritize:
- culturally iconic details
- memorable names
- opening lines
- emotionally salient facts
- strong thematic identifiers
- commonly remembered associations

Avoid:
- exact chapter events
- incidental side characters
- overconfident symbolism
- unsupported interpretations

---

# 14. UI Principles

## Typography First
Elegant readable serif/sans pairing.

---

## Spacious Layout
Low visual density.

---

## Minimal Motion
Subtle transitions only.

---

## Neutral Palette
Muted tones.
Warm/dark literary atmosphere preferred.

---

## No Gamification
Explicit anti-goal.

No:
- streaks
- levels
- XP
- leaderboards
- badges

---

# 15. Search & Input

When answer is a book title:
- freeform input
- searchable autocomplete dropdown
- constrained to books already owned by user

---

# 16. Authentication

Use Supabase Auth.

Single-user private system.

No social features.

---

# 17. V1 Explicit Non-Goals

Do NOT implement:
- AI chat tutor
- social features
- annotations
- shared decks
- public profiles
- audio narration
- deep analytics
- adaptive pedagogy
- collaborative editing
- achievement systems
- discourse/forums

---

# 18. Future Extensions (Post-V1)

Potential later additions:

## Confusion Pairs
Detect commonly confused entities.

---

## Audio Quote Recall
Recite favorite quotes aloud.

---

## Richer Canon Graph
Cross-book thematic associations.

---

## Dynamic Regeneration
Refresh weak recall items over time.

---

## Temporal Literary Maps
Chronological literary memory visualization.

---

# 19. Suggested Initial Build Order

## Phase 1
Core infrastructure
- auth
- DB schema
- book CRUD

---

## Phase 2
Import pipeline
- metadata fetch
- AI generation
- storage

---

## Phase 3
Recall engine
- prompt rendering
- grading
- scheduling
- sessions

---

## Phase 4
Quote progression system

---

## Phase 5
Book profile pages

---

## Phase 6
Polish
- typography
- pacing
- atmosphere
- transitions

---

# 20. Final Product Standard

The app succeeds if it feels like:

> maintaining a cultivated private literary memory

rather than:

> studying for a literature exam.

