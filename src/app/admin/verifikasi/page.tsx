'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ProofRow = {
  id: string
  created_at: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  user_id: string
  amount?: number | null
  proof_url?: string | null // jika kolom ini ada di payment_proofs
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AdminVerifikasiPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [items, setItems] = useState<ProofRow[]>([])

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setErr(null)

    // pastikan sudah login
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) {
      router.replace('/login')
      return
    }

    // ambil daftar PENDING
    const { data, error } = await supabase
      .from('payment_proofs')
      .select('id, created_at, status, user_id, amount, proof_url')
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

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  async function approve(id: string) {
    try {
      const r = await fetch(`/api/proofs/${id}/approve`, { method: 'POST' })
      const j: { ok?: boolean; error?: string } = await r.json().catch(() => ({}))
      if (!r.ok || j?.error) throw new Error(j?.error || 'Gagal approve')
      await fetchPending()
      alert('Berhasil disetujui ✅')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal approve'
      alert('Gagal: ' + msg)
    }
  }

  async function reject(id: string) {
    try {
      const r = await fetch(`/api/proofs/${id}/reject`, { method: 'POST' })
      const j: { ok?: boolean; error?: string } = await r.json().catch(() => ({}))
      if (!r.ok || j?.error) throw new Error(j?.error || 'Gagal reject')
      await fetchPending()
      alert('Ditolak ❌')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal reject'
      alert('Gagal: ' + msg)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Verifikasi Bukti Setoran</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin')}
            className="px-3 py-1 rounded border"
          >
            ← Kembali ke Dashboard
          </button>
          <button
            onClick={fetchPending}
            className="px-3 py-1 rounded bg-gray-800 text-white hover:bg-gray-900"
          >
            Muat Ulang
          </button>
        </div>
      </div>

      {loading && <div>Memuat…</div>}
      {err && <div className="text-red-600">❌ {err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="text-sm text-gray-500">Tidak ada bukti PENDING.</div>
      )}

      <div className="rounded-2xl border overflow-hidden">
        <div className="hidden md:grid grid-cols-6 gap-2 px-4 py-2 border-b text-sm font-medium bg-gray-50 dark:bg-gray-800">
          <div>Tanggal</div>
          <div>User</div>
          <div>Nominal</div>
          <div>Bukti</div>
          <div className="col-span-2 text-right pr-2">Aksi</div>
        </div>

        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-600">
                {new Date(p.created_at).toLocaleString('id-ID')}
              </div>
              <div className="text-sm break-all">{p.user_id}</div>
              <div className="font-semibold">{rupiah(Number(p.amount || 0))}</div>
              <div>
                {p.proof_url ? (
                  <a
                    href={p.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    Lihat Bukti
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">Tidak ada</span>
                )}
              </div>
              <div className="md:col-span-2 flex md:justify-end gap-2">
                <button
                  onClick={() => approve(p.id)}
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

      <p className="text-xs text-gray-500">
        Catatan: kolom <code>proof_url</code> opsional. Jika kamu menyimpan bukti di Supabase Storage, pastikan
        menyimpan URL publiknya di <code>payment_proofs.proof_url</code> saat upload.
      </p>
    </div>
  )
}
