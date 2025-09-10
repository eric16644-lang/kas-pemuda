// src/app/request/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

const supabase = supabaseBrowser()

export default function RequestPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)

    const { error } = await supabase
      .from('requests') // pastikan sudah buat tabel `requests`
      .insert([{ full_name: fullName, email, whatsapp, reason }])

    if (error) {
      setMsg('❌ Gagal submit: ' + error.message)
    } else {
      setMsg('✅ Request berhasil dikirim. Admin akan menghubungi Anda.')
      setFullName('')
      setEmail('')
      setWhatsapp('')
      setReason('')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Request Akun Member Baru</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nama Lengkap</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Nomor WhatsApp (opsional)</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Alasan / Catatan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        {msg && <div className="text-sm">{msg}</div>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? 'Mengirim…' : 'Kirim Request'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="px-4 py-2 rounded border"
          >
            Kembali
          </button>
        </div>
      </form>
    </div>
  )
}
