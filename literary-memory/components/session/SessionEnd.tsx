import Link from 'next/link'

export default function SessionEnd({ recalled, missed }: { recalled: number; missed: number }) {
  return (
    <div className="py-16 text-center">
      <p className="font-serif text-3xl text-neutral-300">
        {recalled} recalled · {missed} missed
      </p>
      <div className="mt-10 flex gap-6 justify-center">
        <Link href="/session" className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors">
          Another session
        </Link>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  )
}
