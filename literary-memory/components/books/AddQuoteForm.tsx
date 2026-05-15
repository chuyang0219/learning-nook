'use client'
import { useState } from 'react'
import { addFavoriteQuote } from '@/actions/quotes'

interface Props {
  bookId: string
}

export default function AddQuoteForm({ bookId }: Props) {
  const [open, setOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [sourceLocation, setSourceLocation] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quoteText.trim()) return
    setPending(true)
    await addFavoriteQuote(bookId, quoteText, sourceLocation || undefined)
    setQuoteText('')
    setSourceLocation('')
    setOpen(false)
    setPending(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
      >
        + Pin a quote
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
      <textarea
        value={quoteText}
        onChange={e => setQuoteText(e.target.value)}
        rows={3}
        placeholder="Quote text…"
        required
        disabled={pending}
        className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-serif text-lg resize-none"
      />
      <input
        value={sourceLocation}
        onChange={e => setSourceLocation(e.target.value)}
        placeholder="Source (optional — e.g. Chapter 3)"
        disabled={pending}
        className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 text-sm"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !quoteText.trim()}
          className="text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Pin quote'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
