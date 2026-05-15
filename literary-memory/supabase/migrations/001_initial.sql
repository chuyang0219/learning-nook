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
