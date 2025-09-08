'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const supabase = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error ? `❌ ${error.message}` : '✅ Login sukses. Sekarang buka /setor')
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border p-2 rounded"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-black text-white px-4 py-2 rounded" type="submit">
          Login
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  )
}
