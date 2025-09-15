// src/app/beranda/keuangan/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Monthly = { credit: number; debit: number; net: number }
type SummaryResp = {
  month: string
  total_all_time: number
  monthly: Monthly
  recent: { at: string; kind: 'CREDIT' | 'DEBIT'; amount: number; note: string | null }[]
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

export default function KeuanganWargaPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [month, setMonth] = useState<string>('-')
  const [credit, setCredit] = useState<number>(0)
  const [debit, setDebit] = useState<number>(0)
  const [net, setNet] = useState<number>(0)

  useEffect(() => {
    ;(async () => {
      // pastikan sudah login
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/login')
        return
      }

      try {
        setLoading(true)
        setErr(null)

        const now = new Date()
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const res = await fetch(`/api/public/summary?month=${ym}`, { cache: 'no-store' })
        const { data, error }: { data?: SummaryResp; error?: string } = await res.json()

        if (!res.ok || error || !data) throw new Error(error || 'Gagal memuat ringkasan')

        setMonth(data.month)
        setCredit(data.monthly.credit ?? 0)
        setDebit(data.monthly.debit ?? 0)
        setNet(data.monthly.net ?? 0)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Terjadi kesalahan')
      } finally {
        setLoading(false)
      }
    })()
  }, [router, supabase])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Transparansi Keuangan</h1>
        <button
          onClick={() => router.push('/beranda')}
          className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-800 text-sm hover:bg-gray-300 dark:hover:bg-gray-700"
        >
          ← Kembali
        </button>
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 text-sm text-gray-600 dark:text-gray-400">
        Periode: <span className="font-medium text-gray-900 dark:text-gray-100">{month}</span>
      </div>

      {loading && <div className="rounded-xl border p-6">Memuat…</div>}
      {err && <div className="rounded-xl border p-6 text-red-600">❌ {err}</div>}

      {!loading && !err && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 bg-white dark:bg-gray-900 shadow border-l-4 border-green-600">
            <div className="text-gray-500 text-sm">Pemasukan Bulan Ini</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-green-700 mt-1">
              {rupiah(credit)}
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white dark:bg-gray-900 shadow border-l-4 border-red-600">
            <div className="text-gray-500 text-sm">Pengeluaran Bulan Ini</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-700 mt-1">
              {rupiah(debit)}
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white dark:bg-gray-900 shadow border-l-4 border-indigo-600">
            <div className="text-gray-500 text-sm">Saldo Bulan Ini</div>
            <div className="text-2xl sm:text-3xl font-extrabold mt-1">
              {rupiah(net)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
