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
