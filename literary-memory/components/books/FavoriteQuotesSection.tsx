import type { FavoriteQuote } from '@/types'

const STAGE_LABELS = ['', 'Attribution', 'Guided recall', 'Short production', 'Verbatim']

export default function FavoriteQuotesSection({ quotes }: { quotes: FavoriteQuote[] }) {
  if (!quotes.length) return null
  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Favourite Quotes</h2>
      <div className="space-y-6">
        {quotes.map(q => (
          <div key={q.id} className="border-l-2 border-neutral-800 pl-4">
            <p className="font-serif text-neutral-300 leading-relaxed text-lg">{q.quote_text}</p>
            {q.source_location && (
              <p className="text-xs text-neutral-600 mt-1">{q.source_location}</p>
            )}
            <p className="text-xs text-neutral-700 mt-1">
              Stage {q.memorization_stage}: {STAGE_LABELS[q.memorization_stage]}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
