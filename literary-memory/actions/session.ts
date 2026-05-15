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
