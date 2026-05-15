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
