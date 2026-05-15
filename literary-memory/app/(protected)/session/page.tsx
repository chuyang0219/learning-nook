import { createClient } from '@/lib/supabase/server'
import { selectSessionItems, isDue } from '@/lib/scheduler'
import Container from '@/components/layout/Container'
import SessionRunner from './SessionRunner'
import Link from 'next/link'
import type { Book, RecallItem } from '@/types'

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>
}) {
  const { force } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: items }, { data: books }] = await Promise.all([
    supabase.from('recall_items').select('*').eq('user_id', user!.id),
    supabase.from('books').select('*').eq('user_id', user!.id),
  ])

  if (!items?.length) {
    return (
      <Container>
        <p className="text-neutral-400 mb-3">No recall items yet.</p>
        <Link href="/import" className="text-neutral-300 underline underline-offset-2">Add a book</Link>
      </Container>
    )
  }

  const bookMap = new Map((books as Book[]).map(b => [b.id, b]))
  const hasDue = (items as RecallItem[]).some(isDue)

  if (!hasDue && !force) {
    return (
      <Container>
        <p className="font-serif text-2xl text-neutral-400 mb-6">You&apos;re caught up.</p>
        <Link
          href="/session?force=1"
          className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
        >
          Start a session anyway →
        </Link>
      </Container>
    )
  }

  const sessionItems = selectSessionItems(items as RecallItem[], bookMap, { count: 10 })

  return (
    <Container>
      <SessionRunner items={sessionItems} allBooks={books as Book[]} />
    </Container>
  )
}
