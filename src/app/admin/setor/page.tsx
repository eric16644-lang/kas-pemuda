'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ApiResp = { ok?: boolean; error?: string }

export default function AdminSetorManualPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const rupiahPreview = (() => {
    const n = Number(amount.replace(/\D+/g, ''))
    return Number.isFinite(n) && n > 0
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
      : '-'
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    const a = Number(amount.replace(/\D+/g, ''))
    if (!Number.isFinite(a) || a <= 0) {
      setErr('Nominal harus angka > 0')
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/add-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: a, note: note || 'Setor manual oleh admin' }),
    })

    let j: ApiResp | null = null
    try { j = (await res.json()) as ApiResp } catch { j = null }

    setLoading(false)

    if (!res.ok || (j && j.error)) {
      setErr(j?.error ?? res.statusText)
      return
    }

    alert('Saldo berhasil ditambahkan ✅')
    router.replace('/admin')
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Tambah Saldo (Admin)</h1>
      <p className="text-sm text-gray-600">
        Gunakan ini untuk mencatat pemasukan kas yang diterima langsung (tunai) tanpa bukti upload.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nominal</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="cth: 50.000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
          <div className="text-xs text-gray-500 mt-1">Pratinjau: {rupiahPreview}</div>
        </div>

        <div>
          <label className="block text-sm mb-1">Catatan (opsional)</label>
          <input
            type="text"
            placeholder="cth: Kas Mingguan RT 3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex gap-2">
          <button
            disabled={loading}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan…' : 'Tambah Saldo'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => router.push('/admin')}
            className="px-4 py-2 rounded border"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
