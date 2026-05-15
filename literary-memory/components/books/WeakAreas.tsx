import type { RecallItem, RecallType } from '@/types'

const TYPE_LABELS: Record<RecallType, string> = {
  author: 'Authorship',
  publication_century: 'Era',
  opening_line: 'Opening line',
  major_character: 'Characters',
  character_relationship: 'Relationships',
  quote_attribution: 'Quote attribution',
  quote_completion: 'Quote completion',
  quote_verbatim: 'Verbatim recall',
  theme_identifier: 'Themes',
  setting: 'Setting',
  title_from_quote: 'Title identification',
  cultural_trivia: 'Cultural context',
}

export default function WeakAreas({ items }: { items: RecallItem[] }) {
  const weakByType = new Map<RecallType, number>()
  for (const item of items) {
    if (item.mastery === 'unfamiliar' || item.mastery === 'learning') {
      weakByType.set(item.type, (weakByType.get(item.type) ?? 0) + 1)
    }
  }

  const weak = [...weakByType.entries()].sort((a, b) => b[1] - a[1])
  if (!weak.length) return null

  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Weak Areas</h2>
      <ul className="space-y-1">
        {weak.map(([type, count]) => (
          <li key={type} className="text-neutral-400 text-sm">
            {TYPE_LABELS[type]}
            <span className="text-neutral-600 ml-2">({count})</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
