'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redirectByRole = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'ADMIN' || profile?.role === 'TREASURER') {
      router.replace('/admin')
    } else {
      router.replace('/kas')
    }
  }, [router, supabase])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) await redirectByRole()
    })()
  }, [redirectByRole, supabase])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMsg(`❌ ${error.message}`)
    else await redirectByRole()
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="email"
               value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" type="password" placeholder="password"
               value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="bg-black text-white px-4 py-2 rounded" type="submit" disabled={loading}>
          {loading ? 'Masuk…' : 'Login'}
        </button>
        <div className="flex flex-col items-center gap-3 mt-4">
  <button
    onClick={() => router.push('/request')}
    className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
  >
    Request Akun Baru
  </button>
</div>

      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>

  )
}
