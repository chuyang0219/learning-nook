import type { RecallItem, Book } from '@/types'

export default function PromptCard({ item, book }: { item: RecallItem; book: Book }) {
  return (
    <div className="mb-8">
      <p className="text-xs text-neutral-500 uppercase tracking-widest mb-5">
        {book.title} · {book.author}
      </p>
      <p className="font-serif text-2xl text-neutral-100 leading-relaxed">
        {item.prompt}
      </p>
    </div>
  )
}
