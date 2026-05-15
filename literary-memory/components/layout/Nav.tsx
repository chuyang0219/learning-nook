import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="border-b border-neutral-800 px-6 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-lg text-neutral-100">
          Literary Memory
        </Link>
        <div className="flex gap-6 text-sm text-neutral-400">
          <Link href="/books" className="hover:text-neutral-100 transition-colors">Library</Link>
          <Link href="/session" className="hover:text-neutral-100 transition-colors">Recall</Link>
          <Link href="/import" className="hover:text-neutral-100 transition-colors">Add Book</Link>
          <Link href="/settings" className="hover:text-neutral-100 transition-colors">Settings</Link>
        </div>
      </div>
    </nav>
  )
}
