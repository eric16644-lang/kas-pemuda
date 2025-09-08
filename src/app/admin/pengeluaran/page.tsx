'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AdminPengeluaranPage() {
  const supabase = supabaseBrowser()
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) { setMsg('❌ Harus login sebagai admin'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), memo })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal catat pengeluaran')
      setMsg('✅ Pengeluaran dicatat')
      setAmount(''); setMemo('')
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
  setMsg(`❌ ${message}`)
} finally {

      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Catat Pengeluaran Kas</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nominal (Rp)</label>
          <input
            type="number"
            min="1"
            className="w-full border rounded p-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Keterangan</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="contoh: beli bola voli"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60"
        >
          {loading ? 'Menyimpan…' : 'Catat Pengeluaran'}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  )
}
