import Container from '@/components/layout/Container'
import { importBook } from '@/actions/import'

export default function ImportPage() {
  return (
    <Container>
      <h1 className="font-serif text-3xl text-neutral-100 mb-2">Add a Book</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Takes 15–30 seconds while we build your memory profile.
      </p>
      <form action={importBook} className="flex flex-col gap-5 max-w-sm">
        <div>
          <label htmlFor="title" className="block text-sm text-neutral-400 mb-1">Title</label>
          <input
            id="title"
            name="title"
            required
            placeholder="Crime and Punishment"
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm text-neutral-400 mb-1">
            Author <span className="text-neutral-600">(optional — helps disambiguation)</span>
          </label>
          <input
            id="author"
            name="author"
            placeholder="Fyodor Dostoevsky"
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <button
          type="submit"
          className="self-start bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors"
        >
          Import book
        </button>
      </form>
    </Container>
  )
}
