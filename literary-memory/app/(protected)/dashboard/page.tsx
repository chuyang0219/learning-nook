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
