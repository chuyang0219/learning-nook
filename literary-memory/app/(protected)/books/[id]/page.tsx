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
