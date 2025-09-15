// src/app/beranda/kegiatan/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function KegiatanComingSoonPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  // Pastikan hanya user login yang bisa melihat
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) router.replace('/login')
    })()
  }, [router, supabase])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
                        bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          Kegiatan — Coming Soon
        </div>

        {/* Title */}
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Sedang Dalam Pengembangan
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Tim kami sedang menyiapkan halaman <span className="font-medium">Kegiatan</span> yang
          menampilkan agenda, dokumentasi, dan laporan singkat setiap acara warga.
        </p>

        {/* Card */}
        <div className="mt-8 rounded-2xl border bg-white dark:bg-gray-900 shadow-sm p-6 text-left">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Rencana Fitur:
          </h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Kalender kegiatan dan pengumuman</li>
            <li>• Foto & dokumentasi acara</li>
            <li>• Ringkasan anggaran per kegiatan</li>
            <li>• Form partisipasi / pendaftaran</li>
          </ul>

          {/* Skeleton contoh */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => router.push('/beranda')}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ← Kembali ke Beranda
          </button>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Cek Pembaruan
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
          Versi awal akan segera tersedia. Terima kasih atas kesabarannya.
        </p>
      </div>
    </div>
  )
}
