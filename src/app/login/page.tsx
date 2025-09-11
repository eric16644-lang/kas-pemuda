// src/app/login/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Jika sudah login, alihkan sesuai role
  const redirectByRole = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        // fallback ke /kas bila gagal baca role
        router.replace('/kas')
        return
      }

      const role = data?.role ?? 'MEMBER'
      if (role === 'ADMIN' || role === 'TREASURER') router.replace('/admin')
      else router.replace('/kas')
    },
    [router, supabase]
  )

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (uid) await redirectByRole(uid)
    })()
  }, [redirectByRole, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setError(error.message || 'Login gagal')
      return
    }
    const uid = data.user?.id
    if (uid) await redirectByRole(uid)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-neutral-100 dark:bg-neutral-900">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl shadow-lg bg-white dark:bg-neutral-800">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT: Sign in form */}
          <div className="p-8 md:p-12">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Sign in</h1>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                disabled={loading}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
              >
                {loading ? 'Memproses…' : 'SIGN IN'}
              </button>
            </form>
          </div>

          {/* RIGHT: Invitation panel */}
          <div className="relative flex items-center justify-center p-10 md:p-12 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <div className="max-w-sm text-center space-y-5">
              <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm">Halo, Teman!</h2>
              <p className="text-white/90">
                Daftarkan diri anda dan mulai gunakan layanan kami segera
              </p>
              <button
                onClick={() => router.push('/request')}
                className="mx-auto inline-flex items-center justify-center rounded-full bg-white text-emerald-600 hover:bg-neutral-100 font-semibold px-6 py-2.5 shadow"
                aria-label="Sign up"
              >
                SIGN UP
              </button>
            </div>

            {/* separator on small screens (optional aesthetic) */}
            <div className="hidden md:block absolute left-0 top-0 bottom-0 w-px bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  )
}
