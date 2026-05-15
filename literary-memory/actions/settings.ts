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
