'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ProofRow = {
  id: string
  created_at: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  user_id: string
  amount_input: number | null
  proof_url: string | null
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AdminVerifikasiPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [items, setItems] = useState<ProofRow[]>([])
  const [fallbackAmount, setFallbackAmount] = useState<Record<string, string>>({})

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setErr(null)

    const { data: s } = await supabase.auth.getSession()
    if (!s.session) { router.replace('/login'); return }

    const { data, error } = await supabase
      .from('payment_proofs')
      .select('id, created_at, status, user_id, amount_input, proof_url')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) { setErr(error.message); setLoading(false); return }

    setItems((data ?? []) as ProofRow[])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { fetchPending() }, [fetchPending])

  function onChangeFallback(id: string, v: string) {
    setFallbackAmount((m) => ({ ...m, [id]: v }))
  }

  async function approve(id: string, existingAmount: number | null) {
    try {
      let bodyString: string | undefined
      let headers: HeadersInit | undefined

      // data lama yang belum punya amount_input (harusnya jarang)
      if (existingAmount === null) {
        const raw = fallbackAmount[id]
        const a = Number(raw?.replace(/\D+/g, ''))
        if (!Number.isFinite(a) || a <= 0) { alert('Masukkan nominal fallback (> 0).'); return }
        bodyString = JSON.stringify({ amount: a })
        headers = { 'Content-Type': 'application/json' }
      }

      const r = await fetch(`/api/proofs/${id}/approve`, { method: 'POST', headers, body: bodyString })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || (j && (j as { error?: string }).error)) {
        throw new Error((j as { error?: string }).error ?? 'Gagal approve')
      }
      await fetchPending()
      alert('Berhasil disetujui ✅')
    } catch (e) {
      alert('Gagal: ' + (e instanceof Error ? e.message : 'approve'))
    }
  }

  async function reject(id: string) {
    try {
      const r = await fetch(`/api/proofs/${id}/reject`, { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || (j && (j as { error?: string }).error)) {
        throw new Error((j as { error?: string }).error ?? 'Gagal reject')
      }
      await fetchPending()
      alert('Ditolak ❌')
    } catch (e) {
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
        <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-2 border-b text-sm font-medium bg-gray-50 dark:bg-gray-800">
          <div>Tanggal</div>
          <div>User</div>
          <div>Nominal</div>
          <div className="text-center">Status</div>
          <div className="text-center">Bukti</div>
          <div className="text-center">Link</div>
          <div className="text-right pr-2">Aksi</div>
        </div>

        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
              <div className="text-sm text-gray-600">{new Date(p.created_at).toLocaleString('id-ID')}</div>
              <div className="text-sm break-all">{p.user_id}</div>
              <div className="font-semibold">
                {typeof p.amount_input === 'number'
                  ? rupiah(p.amount_input)
                  : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="fallback"
                        value={fallbackAmount[p.id] ?? ''}
                        onChange={(e) => onChangeFallback(p.id, e.target.value)}
                        className="w-28 rounded border px-2 py-1"
                      />
                      <span className="text-xs text-gray-500">← isi nominal jika kosong</span>
                    </div>
                  )
                }
              </div>
              <div className="text-center">
                <span className="rounded-full px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-700">{p.status}</span>
              </div>
              <div className="text-center">
                {p.proof_url
                  ? <img src={p.proof_url} alt="bukti" className="inline-block h-12 w-12 object-cover rounded" />
                  : <span className="text-xs text-gray-400">—</span>
                }
              </div>
              <div className="text-center">
                {p.proof_url
                  ? <a href={p.proof_url} target="_blank" className="text-blue-600 underline text-xs">Buka</a>
                  : <span className="text-xs text-gray-400">—</span>
                }
              </div>
              <div className="flex md:justify-end gap-2">
                <button
                  onClick={() => approve(p.id, p.amount_input)}
                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">Pastikan nominal sesuai bukti sebelum Approve.</p>
    </div>
  )
}
