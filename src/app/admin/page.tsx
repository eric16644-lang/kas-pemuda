// src/app/admin/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Tx = { at: string; kind: 'CREDIT' | 'DEBIT'; amount: number; note: string | null }
type Monthly = { credit: number; debit: number; net: number }
type Summary = { month: string; total_all_time: number; monthly: Monthly; recent: Tx[] }

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [sum, setSum] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Guard ringan: kalau belum login, arahkan ke /login (middleware juga sudah melindungi)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) router.replace('/login')
    })()
  }, [router, supabase])

  const fetchSummary = async () => {
    setLoading(true); setErr(null)
    try {
      // API publik summary kita sudah menampilkan total & 20 transaksi terbaru
      const res = await fetch('/api/public/summary', { cache: 'no-store' })
      const json: { data?: Summary; error?: string } = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal ambil ringkasan')
      setSum(json.data ?? null)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Gagal ambil ringkasan'
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchSummary() }, [])

  const recent = useMemo(() => sum?.recent ?? [], [sum])

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/verifikasi')}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Verifikasi
          </button>
          <button
            onClick={() => router.push('/setor')}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            + Setor
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded border"
            title="Keluar akun admin"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Jumlah Setoran (Bulan Ini)</div>
          <div className="text-3xl font-semibold text-green-700">
            {rupiah(sum?.monthly.credit ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Periode: {sum?.month ?? '-'}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Total Kas (All-time)</div>
          <div className="text-3xl font-semibold">
            {rupiah(sum?.total_all_time ?? 0)}
          </div>
        </div>
      </div>

      {/* Riwayat transaksi */}
      <div className="rounded-2xl border">
        <div className="p-4 border-b font-medium flex items-center justify-between">
          <span>Riwayat Transaksi Terbaru</span>
          <button onClick={fetchSummary} className="text-sm underline">Refresh</button>
        </div>

        {loading && <div className="p-4">Memuat…</div>}
        {err && <div className="p-4 text-red-600">❌ {err}</div>}
        {!loading && !err && recent.length === 0 && (
          <div className="p-4 text-sm text-gray-500">Belum ada transaksi.</div>
        )}

        <div className="divide-y">
          {recent.map((t, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">
                  {new Date(t.at).toLocaleString('id-ID')}
                </div>
                {t.note && <div className="text-sm">{t.note}</div>}
              </div>
              <div className={`font-semibold ${t.kind === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
                {t.kind === 'CREDIT' ? '+' : '-'} {rupiah(Number(t.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Tips: gunakan tombol <strong>Verifikasi</strong> untuk memproses setoran PENDING.
      </p>
    </div>
  )
}
