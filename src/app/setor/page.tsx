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
    setUploading(true)

    // 1) (Opsional) Upload file ke Supabase Storage
    let proof_url: string | undefined
    if (file) {
      const { data: s } = await supabase.auth.getSession()
      const uid = s.session?.user.id
      if (!uid) { setError('Anda belum login.'); setUploading(false); return }

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${uid}/${Date.now()}.${ext}`

      // pastikan bucket 'bukti-transfer' sudah dibuat & public
      const up = await supabase.storage.from('bukti-transfer').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })
      if (up.error) {
        setError('Gagal upload bukti: ' + up.error.message)
        setUploading(false)
        return
      }

      const pub = supabase.storage.from('bukti-transfer').getPublicUrl(path)
      proof_url = pub.data.publicUrl
    }

    // 2) Kirim data ke API
    const r = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: a, proof_url }),
    })
    const j = await r.json().catch(() => ({}))

    setUploading(false)
    if (!r.ok || (j && (j as { error?: string }).error)) {
      setError('Gagal submit: ' + ((j as { error?: string }).error ?? r.statusText))
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
          <label className="block text-sm mb-1">Bukti Transfer (gambar)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Unggah screenshot/ foto bukti transfer.</p>
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
