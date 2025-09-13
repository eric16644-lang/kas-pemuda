// src/app/beranda/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function BerandaPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
      }
    })()
  }, [router, supabase])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold">Beranda</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Selamat datang! Akun Anda berperan sebagai <b>WARGA</b>.
        Hubungi admin untuk meng-upgrade role agar bisa mengakses fitur kas.
      </p>

      <div className="mt-6 rounded-xl border bg-white dark:bg-gray-900 p-5">
        <h2 className="font-semibold mb-2">Informasi</h2>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          <li>Halaman ini khusus pengguna dengan role <b>WARGA</b>.</li>
          <li>Akses ke <code>/kas</code> dan <code>/admin</code> dibatasi.</li>
        </ul>
      </div>
    </div>
  )
}
