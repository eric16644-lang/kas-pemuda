'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import NotificationBell from '@/components/NotificationBell'
import UserMenu from '@/components/UserMenu'

type Tx = {
  at: string
  kind: 'CREDIT' | 'DEBIT'
  amount: number
  note: string | null
}

type Monthly = {
  credit: number
  debit: number
  net: number
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

export default function KasPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [recent, setRecent] = useState<Tx[]>([])
  const [monthly, setMonthly] = useState<Monthly | null>(null)
  const [total, setTotal] = useState<number>(0)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/login')
        return
      }

      setLoading(true)
      setErr(null)

      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const { data, error } = await fetch(`/api/public/summary?month=${ym}`).then((r) => r.json())
      if (error) {
        setErr(error)
        setLoading(false)
        return
      }

      setRecent(data.recent)
      setMonthly(data.monthly)
      setTotal(data.total_all_time)
      setLoading(false)
    })()
  }, [router, supabase])

  const empty = !loading && !err && recent.length === 0

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kas Pemuda</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => router.push('/setor')}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
          >
            + Setor
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Pemasukan Bulan Ini</div>
          <div className="text-xl font-bold text-green-600">{rupiah(monthly?.credit || 0)}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Pengeluaran Bulan Ini</div>
          <div className="text-xl font-bold text-red-600">{rupiah(monthly?.debit || 0)}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Total Bulan Ini</div>
          <div className="text-xl font-bold">{rupiah(monthly?.net || 0)}</div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm text-gray-500">Total Saldo</div>
        <div className="text-2xl font-bold">{rupiah(total)}</div>
      </div>

      {/* Transaksi Terbaru */}
      <div className="rounded-2xl border">
        <div className="p-4 border-b font-medium">Transaksi Terbaru</div>

        {loading && <div className="p-4">Memuat…</div>}
        {err && <div className="p-4 text-red-600">❌ {err}</div>}
        {empty && <div className="p-4 text-gray-500 text-sm">Belum ada transaksi di bulan ini.</div>}

        <div className="divide-y">
          {recent.map((t: Tx, i: number) => {
            // PRIORITAS: jika ada catatan (note) dari admin, tampilkan note itu.
            // Kalau tidak ada note dan transaksi adalah CREDIT, tampilkan teks default "disetujui admin".
            // Kalau DEBIT tanpa note, tampilkan "Pengeluaran kas".
            const line =
              t.note && t.note.trim().length > 0
                ? t.note
                : t.kind === 'CREDIT'
                ? 'Setoran Kas telah disetujui oleh Admin'
                : 'Pengeluaran kas'

            return (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">
                    {new Date(t.at).toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm">{line}</div>
                </div>
                <div
                  className={`font-semibold ${
                    t.kind === 'CREDIT' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {t.kind === 'CREDIT' ? '+' : '-'} {rupiah(Number(t.amount))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
