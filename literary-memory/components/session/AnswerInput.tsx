'use client'
import { useState } from 'react'
import type { RecallItem } from '@/types'

const SELECTABLE_TYPES = new Set([
  'author', 'major_character', 'quote_attribution', 'publication_century',
])

interface Props {
  item: RecallItem
  allBooks: Array<{ id: string; title: string }>
  onSubmit: (answer: string) => void
  disabled: boolean
}

export default function AnswerInput({ item, allBooks, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value)
  }

  if (item.type === 'title_from_quote') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={disabled}
          className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 focus:outline-none focus:border-neutral-500"
        >
          <option value="">Select a book…</option>
          {allBooks.map(b => (
            <option key={b.id} value={b.title}>{b.title}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={disabled || !value}
          className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors disabled:opacity-40"
        >
          Submit
        </button>
      </form>
    )
  }

  if (item.alternate_answers?.length && SELECTABLE_TYPES.has(item.type)) {
    const options = [item.answer, ...item.alternate_answers].sort(() => Math.random() - 0.5)
    return (
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => !disabled && onSubmit(opt)}
            disabled={disabled}
            className="text-left px-4 py-3 rounded border border-neutral-700 hover:border-neutral-500 text-neutral-200 transition-colors disabled:opacity-40 font-serif"
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder="Your answer…"
        className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none font-serif text-lg"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors disabled:opacity-40"
      >
        Submit
      </button>
    </form>
  )
}
