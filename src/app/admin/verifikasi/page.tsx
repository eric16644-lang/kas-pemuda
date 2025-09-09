'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ProofRow = {
  id: string
  created_at: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  user_id: string
}

export default function AdminVerifikasiPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [items, setItems] = useState<ProofRow[]>([])
  // simpan nominal per proofId
  const [amountMap, setAmountMap] = useState<Record<string, string>>({})

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setErr(null)

    const { data: s } = await supabase.auth.getSession()
    if (!s.session) {
      router.replace('/login')
      return
    }

    const { data, error } = await supabase
      .from('payment_proofs')
      .select('id, created_at, status, user_id')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      setErr(error.message)
      setLoading(false)
      return
    }

    setItems((data ?? []) as ProofRow[])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { fetchPending() }, [fetchPending])

  function onChangeAmount(id: string, v: string) {
    setAmountMap((m) => ({ ...m, [id]: v }))
  }

  async function approve(id: string) {
    try {
      const raw = amountMap[id]
      const amount = Number(raw?.replace(/\D+/g, '')) // ambil angka saja
      if (!Number.isFinite(amount) || amount <= 0) {
        alert('Masukkan nominal (IDR) yang benar (> 0).')
        return
      }
      const r = await fetch(`/api/proofs/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.error) throw new Error(j?.error || 'Gagal approve')
      await fetchPending()
      alert('Berhasil disetujui ✅')
    } catch (e: unknown) {
      alert('Gagal: ' + (e instanceof Error ? e.message : 'approve'))
    }
  }

  async function reject(id: string) {
    try {
      const r = await fetch(`/api/proofs/${id}/reject`, { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.error) throw new Error(j?.error || 'Gagal reject')
      await fetchPending()
      alert('Ditolak ❌')
    } catch (e: unknown) {
      alert('Gagal: ' + (e instanceof Error ? e.message : 'reject'))
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Verifikasi Bukti Setoran</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin')} className="px-3 py-1 rounded border">← Dashboard</button>
          <button onClick={fetchPending} className="px-3 py-1 rounded bg-gray-800 text-white hover:bg-gray-900">Muat Ulang</button>
        </div>
      </div>

      {loading && <div>Memuat…</div>}
      {err && <div className="text-red-600">❌ {err}</div>}
      {!loading && !err && items.length === 0 && <div className="text-sm text-gray-500">Tidak ada bukti PENDING.</div>}

      <div className="rounded-2xl border overflow-hidden">
        <div className="hidden md:grid grid-cols-6 gap-2 px-4 py-2 border-b text-sm font-medium bg-gray-50 dark:bg-gray-800">
          <div>Tanggal</div>
          <div>User</div>
          <div>Nominal (IDR)</div>
          <div className="text-center">Status</div>
          <div className="text-center">Bukti</div>
          <div className="text-right pr-2">Aksi</div>
        </div>

        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-600">{new Date(p.created_at).toLocaleString('id-ID')}</div>
              <div className="text-sm break-all">{p.user_id}</div>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="cth: 50.000"
                  value={amountMap[p.id] ?? ''}
                  onChange={(e) => onChangeAmount(p.id, e.target.value)}
                  className="w-full rounded border px-2 py-1"
                />
              </div>
              <div className="text-center">
                <span className="rounded-full px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-700">{p.status}</span>
              </div>
              <div className="text-center text-xs text-gray-400">—</div>
              <div className="flex md:justify-end gap-2">
                <button onClick={() => approve(p.id)} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                  Approve
                </button>
                <button onClick={() => reject(p.id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">Masukkan nominal setoran sesuai bukti sebelum menekan Approve.</p>
    </div>
  )
}
