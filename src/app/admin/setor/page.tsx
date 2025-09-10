// src/app/admin/setor/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AdminSetorPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rupiahPreview = (() => {
    const n = Number(amount.replace(/\D+/g, ''))
    return Number.isFinite(n) && n > 0
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(n)
      : '-'
  })()

  async function handleSubmit(e: React.FormEvent, kind: 'CREDIT' | 'DEBIT') {
    e.preventDefault()
    setError(null)

    const a = Number(amount.replace(/\D+/g, ''))
    if (!Number.isFinite(a) || a <= 0) {
      setError('Nominal tidak valid.')
      return
    }

    setLoading(true)
    try {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        setError('Anda belum login.')
        return
      }

      const res = await fetch('/api/admin/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: a, note: note || null, kind }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Gagal simpan data')

      alert('✅ Transaksi berhasil dicatat')
      router.replace('/admin')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Operasi gagal'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Transaksi Manual (Admin)</h1>

      <form className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nominal</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="cth: 100000"
          />
          <div className="text-xs text-gray-500 mt-1">Pratinjau: {rupiahPreview}</div>
        </div>

        <div>
          <label className="block text-sm mb-1">Catatan (opsional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="contoh: saldo awal, pengeluaran kas, dll"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={(e) => handleSubmit(e, 'CREDIT')}
            disabled={loading}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Memproses…' : 'Tambah Saldo'}
          </button>

          <button
            onClick={(e) => handleSubmit(e, 'DEBIT')}
            disabled={loading}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Memproses…' : 'Pengeluaran'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin')}
            disabled={loading}
            className="px-4 py-2 rounded border"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
