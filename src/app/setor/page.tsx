'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function SetorPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const a = Number(amount.replace(/\D+/g, ''))
    if (!Number.isFinite(a) || a <= 0) {
      setError('Masukkan nominal yang benar (> 0).')
      return
    }
    if (!file) {
      setError('Bukti (screenshot) wajib diunggah.')
      return
    }

    setUploading(true)

    // 1) Upload file ke Supabase Storage (BUCKET: proofs)
    const { data: s } = await supabase.auth.getSession()
    const uid = s.session?.user.id
    if (!uid) {
      setError('Anda belum login.')
      setUploading(false)
      return
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${uid}/${Date.now()}.${ext}`

    const up = await supabase.storage.from('proofs').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })
    if (up.error) {
      setError('Gagal upload bukti: ' + up.error.message)
      setUploading(false)
      return
    }

    const pub = supabase.storage.from('proofs').getPublicUrl(path)
    const screenshot_url = pub.data.publicUrl

    // 2) Kirim data ke API (amount_input + screenshot_url)
    const r = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: a, screenshot_url }),
    })
    const j = await r.json().catch(() => ({} as any))

    setUploading(false)

    if (!r.ok || (j as { error?: string })?.error) {
      setError('Gagal submit: ' + ((j as { error?: string })?.error ?? r.statusText))
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

        <div>
          <label className="block text-sm mb-1">Bukti Transfer (screenshot) – wajib</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Unggah screenshot/foto bukti transfer.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
