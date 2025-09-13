// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Email dan password wajib diisi')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    })
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Gagal masuk')
      return
    }

    toast.success('Berhasil masuk')
    // Arahkan: bila admin -> /admin, selain itu -> /kas
    const role = (data.user?.user_metadata as any)?.role
    router.replace(role === 'admin' ? '/admin' : '/kas')
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--background)] px-4 py-6">
      <div className="w-full max-w-sm">
        {/* Header / brand */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Masuk</h1>
          <p className="text-sm text-gray-500 mt-1">
            Selamat datang kembali ke Kas Pemuda
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/70 backdrop-blur shadow-sm p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm">Email</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm">Kata Sandi</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium shadow hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Belum punya akun?{' '}
              <a
                href="/request"
                className="font-medium text-blue-600 hover:underline"
              >
                Ajukan pendaftaran
              </a>
            </p>
          </div>
        </div>

        {/* Footer kecil */}
        <p className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Kas Pemuda
        </p>
      </div>
    </div>
  )
}
