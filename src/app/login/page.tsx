'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Jika sudah login dan buka /login, arahkan ke /kas
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) router.replace('/kas')
    })()
  }, [router, supabase])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) setMsg(`❌ ${error.message}`)
    else router.replace('/kas') // ✅ langsung ke /kas setelah login
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border p-2 rounded"
          placeholder="email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        <button className="bg-black text-white px-4 py-2 rounded" type="submit" disabled={loading}>
          {loading ? 'Masuk…' : 'Login'}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  )
}
