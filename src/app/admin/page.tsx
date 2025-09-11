// src/app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import NotificationBell from '@/components/NotificationBell'

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
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) router.replace('/login')
    })()
  }, [router, supabase])

  const fetchSummary = async () => {
    setLoading(true)
    setErr(null)
    try {
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

  useEffect(() => {
    void fetchSummary()
  }, [])

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const callAdmin = async (url: string, confirmText: string) => {
    setMsg(null)
    const ok = confirm(confirmText)
    if (!ok) return
    setBusy(true)
    try {
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Operasi gagal')
      setMsg('✅ Operasi berhasil.')
      await fetchSummary()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Operasi gagal'
      setMsg(`❌ ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight">📊 Dashboard Admin</h1>
        <div className="flex items-center gap-3">
          <NotificationBell />

          <button
            onClick={() => router.push('/admin/verifikasi')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition"
          >
            Verifikasi
          </button>

          <button
            onClick={() => router.push('/admin/requests')}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Requests Akun
          </button>

          {/* Setor manual (ke /setor sesuai flow lama) */}
          <button
            onClick={() => router.push('/setor')}
            className="px-4 py-2 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 transition"
          >
            + Setor
          </button>

          {/* Tambah saldo oleh admin */}
          <button
            onClick={() => router.push('/admin/setor')}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
          >
            + Tambah Saldo
          </button>

          {/* Pengeluaran kas */}
          <button
            onClick={() => router.push('/admin/pengeluaran')}
            className="px-4 py-2 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition"
          >
            Pengeluaran
          </button>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Keluar akun admin"
          >
            Logout
          </button>
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 shadow-md border-l-4 border-green-600">
          <div className="text-sm text-gray-500">Jumlah Setoran (Bulan Ini)</div>
          <div className="text-3xl font-bold text-green-700">{rupiah(sum?.monthly.credit ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-1">Periode: {sum?.month ?? '-'}</div>
        </div>

        <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 shadow-md border-l-4 border-red-600">
          <div className="text-sm text-gray-500">Jumlah Pengeluaran (Bulan Ini)</div>
          <div className="text-3xl font-bold text-red-700">{rupiah(sum?.monthly.debit ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-1">Periode: {sum?.month ?? '-'}</div>
        </div>

        <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 shadow-md border-l-4 border-blue-600">
          <div className="text-sm text-gray-500">Total Kas (All-time)</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {rupiah(sum?.total_all_time ?? 0)}
          </div>
        </div>
      </div>

      {/* Aksi admin */}
      <div className="rounded-2xl border p-6 shadow-sm bg-gray-50 dark:bg-gray-800">
        <div className="font-semibold mb-3 text-lg">⚠️ Aksi Admin (Hati-hati)</div>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={() =>
              callAdmin('/api/admin/reset-balance', 'Reset saldo ke 0 dengan penyesuaian? Riwayat TETAP ADA.')
            }
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Reset Saldo ke 0
          </button>

          <button
            disabled={busy}
            onClick={() =>
              callAdmin('/api/admin/wipe', 'KOSONGKAN seluruh riwayat transaksi? TINDAKAN INI TIDAK BISA DIBATALKAN.')
            }
            className="px-4 py-2 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition"
          >
            Kosongkan Riwayat
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          • <strong>Reset Saldo</strong>: menambah transaksi penyesuaian agar saldo jadi 0.
          <br />• <strong>Kosongkan Riwayat</strong>: menghapus semua transaksi (tidak dapat dibatalkan).
        </p>
      </div>

      {/* Riwayat transaksi */}
      <div className="rounded-2xl border shadow-sm bg-white dark:bg-gray-900">
        <div className="p-4 border-b font-semibold flex items-center justify-between">
          <span>📑 Riwayat Transaksi Terbaru</span>
          <button onClick={fetchSummary} className="text-sm underline hover:text-blue-600">
            Refresh
          </button>
        </div>

        {loading && <div className="p-4">Memuat…</div>}
        {err && <div className="p-4 text-red-600">❌ {err}</div>}
        {!loading && !err && (sum?.recent?.length ?? 0) === 0 && (
          <div className="p-4 text-sm text-gray-500">Belum ada transaksi.</div>
        )}

        <div className="divide-y">
          {sum?.recent?.map((t: Tx, i: number) => (
            <div
              key={i}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <div>
                <div className="text-xs text-gray-400">{new Date(t.at).toLocaleString('id-ID')}</div>
                {t.note && <div className="text-sm">{t.note}</div>}
              </div>
              <div className={`font-bold ${t.kind === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
                {t.kind === 'CREDIT' ? '+' : '-'} {rupiah(Number(t.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
