import Container from '@/components/layout/Container'
import { importFavoriteQuotes } from '@/actions/settings'

export default function SettingsPage() {
  return (
    <Container>
      <h1 className="font-serif text-3xl text-neutral-100 mb-10">Settings</h1>

      <section>
        <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">
          Import Favourite Quotes
        </h2>
        <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
          Paste your <code className="text-neutral-400">favourite_quotes.md</code> content.
          Use <code className="text-neutral-400">## Book Title</code> headers with one quote per line.
          Existing quotes are preserved — re-importing is safe.
          Book titles must match exactly what you imported.
        </p>
        <form action={importFavoriteQuotes} className="flex flex-col gap-4">
          <textarea
            name="markdown"
            rows={14}
            placeholder={'## Pride and Prejudice\nIt is a truth universally acknowledged...\n\n## Wuthering Heights\nWhatever our souls are made of...'}
            className="bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 font-mono text-sm resize-y"
          />
          <button
            type="submit"
            className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors"
          >
            Import quotes
          </button>
        </form>
      </section>
    </Container>
  )
}
