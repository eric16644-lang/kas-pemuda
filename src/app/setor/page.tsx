'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function SetorPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [amount, setAmount] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const a = Number(amount.replace(/\D+/g, ''))
    if (!Number.isFinite(a) || a <= 0) {
      alert('Masukkan nominal yang benar (> 0).')
      return
    }
    setUploading(true)

    // (opsional) kalau ingin upload file ke Supabase Storage dan simpan URL publik:
    // const bucket = 'bukti-transfer'
    // let proof_url: string | null = null
    // if (proofFile) {
    //   const { data: s } = await supabase.auth.getSession()
    //   const uid = s.session?.user.id
    //   const path = `${uid}/${Date.now()}_${proofFile.name}`
    //   const up = await supabase.storage.from(bucket).upload(path, proofFile, { upsert: true })
    //   if (up.error) { alert('Gagal upload bukti: ' + up.error.message); setUploading(false); return }
    //   const pub = supabase.storage.from(bucket).getPublicUrl(path)
    //   proof_url = pub.data.publicUrl
    // }

    const r = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: a,
        // proof_url, // aktifkan jika pakai upload Storage di atas
      }),
    })
    const j = await r.json().catch(() => ({}))
    setUploading(false)

    if (!r.ok || j?.error) {
      alert('Gagal submit: ' + (j?.error || r.statusText))
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
          <label className="block text-sm mb-1">Bukti Transfer (opsional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Jika tidak upload di sini, admin tetap bisa verifikasi dari nominal.</p>
        </div>

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
