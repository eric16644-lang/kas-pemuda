'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetorPage() {
  const router = useRouter()

  const [amount, setAmount] = useState('')
  const [uploading, setUploading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const a = Number(amount.replace(/\D+/g, ''))
    if (!Number.isFinite(a) || a <= 0) {
      alert('Masukkan nominal yang benar (> 0).')
      return
    }
    setUploading(true)

    const r = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: a }),
    })
    const j = await r.json().catch(() => ({}))
    setUploading(false)

    if (!r.ok || (j && (j as { error?: string }).error)) {
      alert('Gagal submit: ' + ((j as { error?: string }).error ?? r.statusText))
      return
    }

    alert('Berhasil mengirim bukti. Status: PENDING ✅')
    router.replace('/kas')
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Setor Kas</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nominal (IDR)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="cth: 50.000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        {/* Jika mau aktifkan upload bukti lagi, tambahkan blok input file & proses upload ke Storage */}

        <div className="flex items-center gap-2">
          <button
            disabled={uploading}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Mengunggah…' : 'Kirim Bukti'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/kas')}
            disabled={uploading}
            className="px-4 py-2 rounded border"
          >
            Kembali
          </button>
        </div>
      </form>
    </div>
  )
}
