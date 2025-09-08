'use client'
import { useEffect, useMemo, useState } from 'react'

type Tx = { at: string; kind: 'CREDIT' | 'DEBIT'; amount: number; note: string | null }
type Monthly = { credit: number; debit: number; net: number }
type Summary = { month: string; total_all_time: number; monthly: Monthly; recent: Tx[] }

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

function currentYYYYMM() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function KasPublikPage() {
  const [month, setMonth] = useState(currentYYYYMM())
  const [sum, setSum] = useState<Summary | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSummary = async (m?: string) => {
    setLoading(true); setErr(null)
    try {
      const q = m ? `?month=${encodeURIComponent(m)}` : ''
      const res = await fetch(`/api/public/summary${q}`, { cache: 'no-store' })
      const json: { data?: Summary; error?: string } = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal ambil data')
      setSum(json.data ?? null)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Gagal ambil data'
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchSummary(month) }, [month])

  const recent = useMemo(() => sum?.recent ?? [], [sum])
  const empty = useMemo(() => !loading && recent.length === 0, [loading, recent.length])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <div className="text-sm text-gray-500">Total Kas (All-time)</div>
          <div className="text-3xl font-semibold">{rupiah(sum?.total_all_time ?? 0)}</div>
        </div>

        <div className="ml-auto">
          <label className="block text-sm text-gray-600 mb-1">Pilih Bulan</label>
          <input type="month" className="border rounded px-3 py-2" value={month}
                 onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {/* Rekap Bulanan (pemasukan/pengeluaran/total) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Pemasukan</div>
          <div className="text-2xl font-semibold text-green-700">
            {rupiah(sum?.monthly.credit ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Pengeluaran</div>
          <div className="text-2xl font-semibold text-red-700">
            {rupiah(sum?.monthly.debit ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Total Bulan Ini</div>
          <div className="text-2xl font-semibold">
            {rupiah((sum?.monthly.credit ?? 0) - (sum?.monthly.debit ?? 0))}
          </div>
        </div>
      </div>

      {/* Transaksi Terbaru */}
      <div className="rounded-2xl border">
        <div className="p-4 border-b font-medium">Transaksi {sum?.month} (Terbaru)</div>

        {loading && <div className="p-4">Memuat…</div>}
        {err && <div className="p-4 text-red-600">❌ {err}</div>}
        {empty && <div className="p-4 text-gray-500 text-sm">Belum ada transaksi di bulan ini.</div>}

        <div className="divide-y">
          {recent.map((t, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{new Date(t.at).toLocaleString('id-ID')}</div>
                {t.note && <div className="text-sm">{t.note}</div>}
              </div>
              <div className={`font-semibold ${t.kind === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
                {t.kind === 'CREDIT' ? '+' : '-'} {rupiah(Number(t.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
