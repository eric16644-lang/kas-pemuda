'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ProofRow = {
  id: string
  created_at: string
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  note: string | null
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function RiwayatPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ProofRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) { router.replace('/login'); return }
      setLoading(true); setErr(null)
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('id, created_at, amount, status, note')
        .eq('user_id', s.session.user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) setErr(error.message)
      setItems((data as ProofRow[]) ?? [])
      setLoading(false)
    })()
  }, [router, supabase])

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Riwayat Submit Bukti</h1>
        <button onClick={() => router.back()} className="px-3 py-1 rounded border">← Kembali</button>
      </div>

      {loading && <div>Memuat…</div>}
      {err && <div className="text-red-600">❌ {err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="text-sm text-gray-500">Belum ada riwayat.</div>
      )}

      <div className="rounded-2xl border overflow-hidden">
        <div className="hidden sm:grid grid-cols-5 gap-2 px-4 py-2 border-b text-sm font-medium bg-gray-50 dark:bg-gray-800">
          <div>Tanggal</div>
          <div className="col-span-2">Keterangan</div>
          <div>Nominal</div>
          <div>Status</div>
        </div>

        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {new Date(p.created_at).toLocaleString('id-ID')}
              </div>
              <div className="sm:col-span-2 text-sm">
                {p.note || 'Setoran kas'}
              </div>
              <div className="font-semibold">{rupiah(Number(p.amount))}</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs
                  ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {p.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
