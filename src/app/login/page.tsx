// src/app/login/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Role = 'ADMIN' | 'MEMBER' | 'WARGA'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Arahkan user yang SUDAH login (hard-refresh / buka /login)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) return

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', uid)
        .maybeSingle()

      const role = (profile?.role as Role | undefined) ?? 'MEMBER'
      if (role === 'ADMIN') router.replace('/admin')
      else if (role === 'WARGA') router.replace('/beranda')
      else router.replace('/kas')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email dan password wajib diisi')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Gagal masuk')
      return
    }

    // ✅ Gunakan user dari hasil login (lebih andal daripada menunggu getSession())
    const uid = data.user?.id
    if (!uid) {
      toast.error('Tidak mendapatkan data pengguna setelah login')
      return
    }

    // Ambil role dari tabel public.users
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .maybeSingle()

    if (profileErr) {
      // fallback aman
      toast.success('Berhasil masuk')
      router.replace('/kas')
      return
    }

    const role = (profile?.role as Role | undefined) ?? 'MEMBER'
    toast.success('Berhasil masuk')
    if (role === 'ADMIN') router.replace('/admin')
    else if (role === 'WARGA') router.replace('/beranda')
    else router.replace('/kas')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold">Masuk</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Akses Kas Pemuda
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm mb-1">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nama@contoh.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-1">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-medium transition disabled:opacity-60"
            >
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Belum punya ID?{' '}
              <button onClick={() => router.push('/request')} className="text-blue-600 hover:underline">
                Request akun
              </button>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Kas Pemuda
        </p>
      </div>
    </div>
  )
}
