'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(url, anon)

export default function SetorPage() {
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    const { data: sessionRes } = await supabase.auth.getSession()
    const accessToken = sessionRes.session?.access_token
    if (!accessToken) { setMsg('Silakan login dulu.'); return }

    if (!amount || !file) { setMsg('Nominal & screenshot wajib.'); return }

    const form = new FormData()
    form.append('amount', amount)
    form.append('screenshot', file)

    setLoading(true)
    try {
      const res = await fetch('/api/proofs', {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json: { ok?: boolean; error?: string } = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal kirim bukti')
      setMsg('✅ Bukti dikirim. Menunggu verifikasi admin.')
      setAmount(''); setFile(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal kirim bukti'
      setMsg(`❌ ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Setor Kas</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nominal (Rp)</label>
          <input type="number" min="1" step="1" className="w-full border rounded p-2"
                 value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="contoh: 10000" />
        </div>
        <div>
          <label className="block text-sm mb-1">Screenshot bukti transfer (JPG/PNG, ≤5MB)</label>
          <input type="file" accept="image/jpeg,image/png"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">
          {loading ? 'Mengunggah…' : 'Kirim Bukti'}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  )
}
