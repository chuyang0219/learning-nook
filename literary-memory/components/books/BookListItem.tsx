import Link from 'next/link'
import type { Book, RecallItem } from '@/types'

interface Props {
  book: Book
  items: RecallItem[]
}

export default function BookListItem({ book, items }: Props) {
  const total = items.length
  const weak = items.filter(i => i.mastery === 'unfamiliar' || i.mastery === 'learning').length

  return (
    <Link
      href={`/books/${book.id}`}
      className="block py-4 border-b border-neutral-800 hover:border-neutral-600 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <span className="font-serif text-lg text-neutral-100 group-hover:text-white transition-colors">
            {book.title}
          </span>
          <span className="text-neutral-500 ml-3 text-sm">{book.author}</span>
        </div>
        <span className="text-xs text-neutral-600 shrink-0">
          {total} items{weak > 0 ? ` · ${weak} weak` : ''}
        </span>
      </div>
    </Link>
  )
}
