import { createClient } from '@/lib/supabase/server'
import Container from '@/components/layout/Container'
import BookListItem from '@/components/books/BookListItem'
import Link from 'next/link'
import type { Book, RecallItem } from '@/types'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: books }, { data: items }] = await Promise.all([
    supabase.from('books').select('*').eq('user_id', user!.id).order('title'),
    supabase.from('recall_items').select('id,book_id,mastery').eq('user_id', user!.id),
  ])

  if (!books?.length) {
    return (
      <Container>
        <p className="text-neutral-400 mb-3">No books yet.</p>
        <Link href="/import" className="text-neutral-300 underline underline-offset-2">
          Add your first book
        </Link>
      </Container>
    )
  }

  const itemsByBook = new Map<string, RecallItem[]>()
  for (const item of (items ?? []) as RecallItem[]) {
    const arr = itemsByBook.get(item.book_id) ?? []
    arr.push(item)
    itemsByBook.set(item.book_id, arr)
  }

  return (
    <Container>
      <h1 className="font-serif text-3xl text-neutral-100 mb-8">Library</h1>
      <div>
        {(books as Book[]).map(book => (
          <BookListItem
            key={book.id}
            book={book}
            items={itemsByBook.get(book.id) ?? []}
          />
        ))}
      </div>
    </Container>
  )
}
