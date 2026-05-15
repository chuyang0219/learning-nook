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
