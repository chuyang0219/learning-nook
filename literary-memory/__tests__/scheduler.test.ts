import { describe, it, expect } from 'vitest'
import { isDue, selectSessionItems } from '../lib/scheduler'
import type { RecallItem, Book } from '../types'

function makeItem(overrides: Partial<RecallItem> = {}): RecallItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    book_id: 'book-1',
    type: 'author',
    prompt: 'Who wrote this?',
    answer: 'Author Name',
    alternate_answers: null,
    metadata: null,
    importance: 'strong',
    mastery: 'unfamiliar',
    consecutive_correct: 0,
    consecutive_wrong: 0,
    times_seen: 0,
    times_correct: 0,
    last_seen_at: null,
    next_due_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeBook(id = 'book-1'): Book {
  return {
    id,
    user_id: 'user-1',
    title: 'Test Book',
    author: 'Author',
    publication_year: 1900,
    publication_century: '20th century',
    tradition: null,
    language: null,
    synopsis_short: null,
    memory_anchors: null,
    cover_image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

describe('isDue', () => {
  it('null next_due_at is due', () => {
    expect(isDue(makeItem({ next_due_at: null }))).toBe(true)
  })
  it('past next_due_at is due', () => {
    expect(isDue(makeItem({ next_due_at: new Date(Date.now() - 1000).toISOString() }))).toBe(true)
  })
  it('future next_due_at is not due', () => {
    expect(isDue(makeItem({ next_due_at: new Date(Date.now() + 60000).toISOString() }))).toBe(false)
  })
})

describe('selectSessionItems', () => {
  const books = new Map([['book-1', makeBook('book-1')]])

  it('returns at most count items', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({ id: `item-${i}`, next_due_at: null })
    )
    const result = selectSessionItems(items, books, { count: 10 })
    expect(result.length).toBeLessThanOrEqual(10)
  })

  it('prioritises due items over not-due', () => {
    const due = makeItem({ id: 'due', next_due_at: new Date(Date.now() - 1000).toISOString() })
    const notDue = makeItem({ id: 'not-due', next_due_at: new Date(Date.now() + 99999).toISOString() })
    const result = selectSessionItems([notDue, due], books, { count: 1 })
    expect(result[0].recallItem.id).toBe('due')
  })

  it('avoids consecutive same-book items when alternatives exist', () => {
    const book2 = makeBook('book-2')
    const twoBooks = new Map([['book-1', makeBook('book-1')], ['book-2', book2]])
    const items = [
      makeItem({ id: 'a1', book_id: 'book-1' }),
      makeItem({ id: 'a2', book_id: 'book-1' }),
      makeItem({ id: 'b1', book_id: 'book-2' }),
    ]
    const result = selectSessionItems(items, twoBooks, { count: 3 })
    const bookIds = result.map(r => r.recallItem.book_id)
    for (let i = 1; i < bookIds.length; i++) {
      if (bookIds[i - 1] === 'book-1') {
        expect(bookIds[i]).not.toBe('book-1')
      }
    }
  })

  it('attaches correct book to each session item', () => {
    const items = [makeItem({ id: 'x', book_id: 'book-1' })]
    const result = selectSessionItems(items, books, { count: 5 })
    expect(result[0].book.id).toBe('book-1')
  })
})
