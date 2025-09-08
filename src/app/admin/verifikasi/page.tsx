'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Proof = {
  id: string
  user_id: string
  amount_input: number
  transfer_datetime: string | null
  bank_name: string | null
  account_last4: string | null
  screenshot_url: string
  signedUrl: string | null
  created_at: string
  member_name: string
}

export default function AdminVerifikasiPage() {
  const supabase = supabaseBrowser()
  const [items, setItems] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // modal states
  const [showExpense, setShowExpense] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [amountExpense, setAmountExpense] = useState('')
  const [memoExpense, setMemoExpense] = useState('')
  const [amountIncome, setAmountIncome] = useState('')
  const [memoIncome, setMemoIncome] = useState('')

  const fetchPending = useCallback(async () => {
  setLoading(true)
  setMsg(null)
  const { data: s } = await supabase.auth.getSession()
  const token = s.session?.access_token
  if (!token) { setMsg('❌ Harus login sebagai ADMIN/TREASURER'); setLoading(false); return }

  const res = await fetch('/api/admin/pending', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  if (!res.ok) { setMsg(`❌ ${json.error || 'Gagal mengambil data'}`); setLoading(false); return }
  setItems(json.data || [])
  setLoading(false)
}, [supabase])


  useEffect(() => { fetchPending() }, [fetchPending])


  const onApprove = async (id: string) => {
    setBusyId(id); setMsg(null)
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) { setMsg('❌ Harus login'); setBusyId(null); return }

    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ proofId: id })
    })
    const json = await res.json()
    if (!res.ok) setMsg(`❌ ${json.error || 'Gagal approve'}`)
    else { setMsg('✅ Disetujui'); await fetchPending() }
    setBusyId(null)
  }

  const onReject = async (id: string) => {
    const notes = prompt('Catatan penolakan (opsional):') || null
    setBusyId(id); setMsg(null)
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) { setMsg('❌ Harus login'); setBusyId(null); return }

    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ proofId: id, notes })
    })
    const json = await res.json()
    if (!res.ok) setMsg(`❌ ${json.error || 'Gagal reject'}`)
    else { setMsg('✅ Ditolak'); await fetchPending() }
    setBusyId(null)
  }

  const handleExpense = async () => {
    setMsg(null)
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) { setMsg('❌ Harus login'); return }
    const amt = Number(amountExpense)
    if (!amt || isNaN(amt) || amt <= 0) { setMsg('❌ Nominal pengeluaran tidak valid'); return }

    const res = await fetch('/api/admin/expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: amt, memo: memoExpense })
    })
    const json = await res.json()
    if (!res.ok) setMsg(`❌ ${json.error || 'Gagal catat pengeluaran'}`)
    else {
      setMsg('✅ Pengeluaran dicatat')
      setShowExpense(false); setAmountExpense(''); setMemoExpense('')
      // opsional refresh pending (tidak wajib)
      await fetchPending()
    }
  }

  const handleIncome = async () => {
    setMsg(null)
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) { setMsg('❌ Harus login'); return }
    const amt = Number(amountIncome)
    if (!amt || isNaN(amt) || amt <= 0) { setMsg('❌ Nominal pemasukan tidak valid'); return }

    const res = await fetch('/api/admin/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: amt, memo: memoIncome })
    })
    const json = await res.json()
    if (!res.ok) setMsg(`❌ ${json.error || 'Gagal tambah saldo'}`)
    else {
      setMsg('✅ Saldo bertambah')
      setShowIncome(false); setAmountIncome(''); setMemoIncome('')
      await fetchPending()
    }
  }

  const empty = useMemo(() => !loading && items.length === 0, [loading, items])

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Verifikasi Setoran (PENDING)</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowIncome(true)} className="px-3 py-2 rounded bg-green-600 text-white">
            + Tambah Saldo
          </button>
          <button onClick={() => setShowExpense(true)} className="px-3 py-2 rounded bg-red-600 text-white">
            - Pengeluaran
          </button>
          <button onClick={fetchPending} className="px-3 py-2 rounded border">Refresh</button>
        </div>
      </div>

      {msg && <div className="mb-3 text-sm">{msg}</div>}
      {loading && <p>Memuat…</p>}
      {empty && <p>Tidak ada data pending.</p>}

      {/* Kartu bukti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((p) => (
          <div key={p.id} className="border rounded-xl p-4">
            <div className="flex gap-4">
              <img
                src={p.signedUrl || '/placeholder.svg'}
                alt="bukti"
                className="w-28 h-28 object-cover rounded"
              />
              <div className="flex-1">
                <div className="font-medium">{p.member_name}</div>
                <div className="text-sm text-gray-600">Rp {p.amount_input.toLocaleString('id-ID')}</div>
                <div className="text-xs text-gray-500">
                  {p.bank_name || 'Bank ?'} · ****{p.account_last4 || '----'}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onApprove(p.id)}
                disabled={busyId === p.id}
                className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-60"
              >
                {busyId === p.id ? 'Memproses…' : 'Approve'}
              </button>
              <button
                onClick={() => onReject(p.id)}
                disabled={busyId === p.id}
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-60"
              >
                {busyId === p.id ? 'Memproses…' : 'Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Pengeluaran */}
      {showExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-lg font-semibold mb-2">Catat Pengeluaran</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Nominal (Rp)</label>
                <input className="w-full border rounded p-2" type="number" min="1" value={amountExpense} onChange={(e)=>setAmountExpense(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Keterangan</label>
                <input className="w-full border rounded p-2" value={memoExpense} onChange={(e)=>setMemoExpense(e.target.value)} placeholder="contoh: beli ATK" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 rounded border" onClick={()=>setShowExpense(false)}>Batal</button>
                <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={handleExpense}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Saldo */}
      {showIncome && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-lg font-semibold mb-2">Tambah Saldo (Setoran Tunai)</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Nominal (Rp)</label>
                <input className="w-full border rounded p-2" type="number" min="1" value={amountIncome} onChange={(e)=>setAmountIncome(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Keterangan</label>
                <input className="w-full border rounded p-2" value={memoIncome} onChange={(e)=>setMemoIncome(e.target.value)} placeholder="contoh: setoran tunai rapat" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 rounded border" onClick={()=>setShowIncome(false)}>Batal</button>
                <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={handleIncome}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
