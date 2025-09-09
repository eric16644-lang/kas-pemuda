'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ApiResp = { ok?: boolean; error?: string }

export default function SetorPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [success, setSuccess] = useState(false)   // ⬅️ indikator sukses

  // Pastikan user login; kalau tidak, arahkan ke /login
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.replace('/login'); return }
      setSessionReady(true)
    })()
  }, [router, supabase])

  // Object URL untuk preview
  useEffect(() => {
    if (!file) {
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
      return
    }
    const newUrl = URL.createObjectURL(file)
    setPreviewUrl(newUrl)
    return () => URL.revokeObjectURL(newUrl)
  }, [file, previewUrl])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setMsg(null)
    if (!f) { setFile(null); return }
    const okTypes = ['image/jpeg', 'image/png']
    if (!okTypes.includes(f.type)) { setMsg('❌ Format harus JPG/PNG'); e.target.value = ''; return }
    const max = 5 * 1024 * 1024
    if (f.size > max) { setMsg('❌ Maks 5MB'); e.target.value = ''; return }
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()            // pastikan tidak reload/navigasi
    e.stopPropagation()
    setMsg(null)
    setSuccess(false)

    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
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
        redirect: 'manual', // ⬅️ cegah auto-follow redirect jika server salah config
      })
      // Jika server salah-salah kirim 3xx, fetch dengan 'manual' tidak akan auto-navigate
      if (res.type === 'opaqueredirect' || res.status === 0) {
        throw new Error('Respon tidak valid (redirect).')
      }
      const json: ApiResp = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Gagal kirim bukti')

      // Sukses — reset form & tampilkan banner sukses
      setAmount('')
      setFile(null)
      setSuccess(true)
      setMsg(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal kirim bukti'
      setMsg(`❌ ${message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return <div className="max-w-md mx-auto p-6">Memuat…</div>
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header + Link kembali (bukan button submit) */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Setor Kas</h1>
        <Link href="/kas" className="px-3 py-1 rounded border inline-block">← Kembali</Link>
      </div>

      {/* Banner sukses */}
      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">
          ✅ Bukti dikirim. Menunggu verifikasi admin.
          <div className="mt-2">
            <Link href="/kas" className="underline text-green-700">Kembali ke halaman kas</Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nominal (Rp)</label>
          <input
            type="number"
            min={1}
            step={1}
            className="w-full border rounded p-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="contoh: 10000"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Upload Screenshot Bukti Transfer</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={onPickFile}
            className="block w-full text-sm text-gray-600
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-gray-100 file:text-gray-700
                       hover:file:bg-gray-200"
          />
          {previewUrl && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Preview:</div>
              <img
                src={previewUrl}
                alt="Preview bukti transfer"
                className="w-40 h-40 object-cover rounded border"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? 'Mengunggah…' : 'Kirim Bukti'}
        </button>
      </form>

      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  )
}
