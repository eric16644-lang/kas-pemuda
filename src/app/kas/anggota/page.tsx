// src/app/kas/anggota/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type MemberRow = {
  id: string
  full_name: string | null
  role: 'MEMBER' | 'TREASURER' | 'ADMIN'
  joined_at: string
  deposit_count: number
}

export default function MembersPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MemberRow[]>([])

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }

      setLoading(true)
      setError(null)
      const { data: list, error } = await supabase.rpc('members_list')
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setRows((list ?? []) as MemberRow[])
      setLoading(false)
    })()
  }, [router, supabase])

  const total = useMemo(() => rows.length, [rows])

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-green-600 text-white'
      case 'TREASURER':
        return 'bg-orange-500 text-white'
      default:
        return 'bg-blue-600 text-white'
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Daftar Anggota</h1>
        <button onClick={() => router.push('/kas')} className="px-3 py-1 rounded border">
          ← Kembali ke /kas
        </button>
      </div>

      <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
        <div className="text-sm text-gray-700 dark:text-gray-300">Jumlah Anggota yang sudah bergabung</div>
        <div className="text-3xl font-semibold">{total}</div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        {/* Header tabel */}
        <div className="hidden md:grid grid-cols-4 gap-2 px-4 py-2 border-b text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          <div>Nama Anggota</div>
          <div>Role</div>
          <div className="text-center">Jumlah Setoran</div>
          <div className="text-right">Waktu Bergabung</div>
        </div>

        {loading && <div className="p-4">Memuat…</div>}
        {error && <div className="p-4 text-red-600">❌ {error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="p-4 text-sm text-gray-500">Belum ada anggota.</div>
        )}

        <ul>
          {rows.map((m, idx) => (
            <li
              key={m.id}
              className={`px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-center 
              ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
              text-gray-900 dark:text-gray-100`}
            >
              <div className="font-medium">{m.full_name || '—'}</div>
              <div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(m.role)}`}
                >
                  {m.role}
                </span>
              </div>
              <div className="text-center">{m.deposit_count}</div>
              <div className="text-right text-sm">{new Date(m.joined_at).toLocaleString('id-ID')}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
