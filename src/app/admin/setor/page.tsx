// src/app/setor/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ApiResp = { ok?: boolean; error?: string }

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function SetorPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const rupiahPreview = useMemo(() => {
    const n = Number(amount.replace(/\D+/g, ''))
    return Number.isFinite(n) && n > 0
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
      : '-'
  }, [amount])

  // Buat / bersihkan preview object URL
  useEffect(() => {
    if (!file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  function onPickClicked() {
    inputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
  }

  function clearFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

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

    // 0) Hitung checksum file (wajib di schema)
    let checksum = ''
    try {
      checksum = await sha256Hex(file)
    } catch {
      setError('Gagal menghitung checksum file.')
      setUploading(false)
      return
    }

    // 1) Upload file ke Supabase Storage (bucket: proofs)
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

    // 2) Simpan request bukti ke API
    const r = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(a), screenshot_url, checksum }),
    })

    let j: ApiResp | null = null
    try { j = (await r.json()) as ApiResp } catch { j = null }

    setUploading(false)

    if (!r.ok || (j && j.error)) {
      setError('Gagal submit: ' + (j?.error ?? r.statusText))
      return
    }

    alert('Berhasil mengirim bukti. Status: PENDING ✅')
    router.replace('/kas')
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Setor Kas</h1>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Nominal */}
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
          <div className="text-xs text-gray-500 mt-1">Pratinjau: {rupiahPreview}</div>
        </div>

        {/* File uploader dengan label DI ATAS tombol */}
        <div>
          <label className="block text-sm mb-2">Pilih Bukti Transfer (screenshot) – wajib</label>

          {/* input file disembunyikan, tombol custom memicu klik */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
            aria-label="Pilih bukti transfer"
            required={!file}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPickClicked}
              className="px-4 py-2 rounded border hover:bg-gray-50"
              disabled={uploading}
            >
              {file ? 'Ganti File' : 'Pilih File'}
            </button>

            {file && (
              <button
                type="button"
                onClick={clearFile}
                className="px-4 py-2 rounded border text-red-700 hover:bg-red-50"
                disabled={uploading}
              >
                Hapus
              </button>
            )}
          </div>

          {/* info file */}
          {file && (
            <div className="mt-2 text-xs text-gray-600">
              <div>Nama: <span className="font-medium">{file.name}</span></div>
              <div>Ukuran: {(file.size / 1024).toFixed(1)} KB</div>
            </div>
          )}

          {/* preview */}
          {previewUrl && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Preview:</div>
              <img
                src={previewUrl}
                alt="Preview bukti transfer"
                className="w-full max-h-64 object-contain rounded border"
              />
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Unggah screenshot/foto bukti transfer. Pastikan teks nominal & waktu terlihat jelas.
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
