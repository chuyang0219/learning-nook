import type { RecallItem, FavoriteQuote, Book, SessionItem } from '@/types'

export function isDue(item: RecallItem | FavoriteQuote): boolean {
  if (!item.next_due_at) return true
  return new Date(item.next_due_at) <= new Date()
}

interface SelectOptions {
  count?: number
  bookId?: string
}

const IMPORTANCE_SCORE = { iconic: 3, strong: 2, secondary: 1 } as const

export function selectSessionItems(
  recallItems: RecallItem[],
  books: Map<string, Book>,
  options: SelectOptions = {}
): SessionItem[] {
  const { count = 10, bookId } = options

  const candidates = bookId
    ? recallItems.filter(item => item.book_id === bookId)
    : recallItems

  const due = candidates
    .filter(isDue)
    .sort((a, b) => IMPORTANCE_SCORE[b.importance] - IMPORTANCE_SCORE[a.importance])

  const notDue = candidates
    .filter(item => !isDue(item))
    .sort((a, b) => {
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
      return aTime - bTime
    })

  const pool = [...due, ...notDue].slice(0, count * 2)
  const selected = avoidConsecutiveSameBook(pool, count)

  return selected.map(item => ({
    type: 'recall' as const,
    recallItem: item,
    book: books.get(item.book_id)!,
  }))
}

function avoidConsecutiveSameBook(items: RecallItem[], count: number): RecallItem[] {
  const result: RecallItem[] = []
  const remaining = [...items]

  while (result.length < count && remaining.length > 0) {
    const lastBookId = result.at(-1)?.book_id
    if (!lastBookId) {
      result.push(remaining.shift()!)
      continue
    }
    const idx = remaining.findIndex(item => item.book_id !== lastBookId)
    if (idx === -1) {
      result.push(remaining.shift()!)
    } else {
      result.push(...remaining.splice(idx, 1))
    }
  }

  return result
}
