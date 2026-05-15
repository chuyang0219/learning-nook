'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setSent(true)
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-400">Check your email for a sign-in link.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-80">
        <h1 className="font-serif text-3xl text-neutral-100">Literary Memory</h1>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-4 py-2 transition-colors"
        >
          Send sign-in link
        </button>
      </form>
    </main>
  )
}
