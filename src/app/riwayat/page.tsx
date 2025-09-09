'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ProofRow = {
  id: string
  created_at: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  note: string | null
}

type LedgerRow = {
  proof_id: string | null
  amount: number
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function RiwayatPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ProofRow[]>([])
  const [amountMap, setAmountMap] = useState<Record<string, number>>({})
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) { router.replace('/login'); return }

      setLoading(true); setErr(null)

      // 1) Ambil riwayat bukti milik user
      const { data: proofs, error: e1 } = await supabase
        .from('payment_proofs')
        .select('id, created_at, status, note')
        .eq('user_id', s.session.user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (e1) {
        setErr(e1.message)
        setLoading(false)
        return
      }

      const list = (proofs ?? []) as ProofRow[]
      setItems(list)

      // 2) Untuk yang APPROVED, ambil amount dari ledger (kind=CREDIT)
      const approvedIds = list.filter(p => p.status === 'APPROVED').map(p => p.id)
      if (approvedIds.length > 0) {
        const { data: rows, error: e2 } = await supabase
          .from('ledger')
          .select('proof_id, amount')
          .eq('user_id', s.session.user.id)
          .eq('kind', 'CREDIT')
          .in('proof_id', approvedIds)

        if (!e2 && rows) {
          const map: Record<string, number> = {}
          ;(rows as LedgerRow[]).forEach(r => {
            if (r.proof_id) map[r.proof_id] = Number(r.amount)
          })
          setAmountMap(map)
        }
      }

      setLoading(false)
    })()
  }, [router, supabase])

  const renderAmount = (p: ProofRow) => {
    if (p.status !== 'APPROVED') return '-' // belum jadi transaksi
    const amt = amountMap[p.id]
    return typeof amt === 'number' ? rupiah(amt) : '-'
  }

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
              <div className="font-semibold">{renderAmount(p)}</div>
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
