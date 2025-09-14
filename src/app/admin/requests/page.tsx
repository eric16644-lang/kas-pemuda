'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ReqRow = {
  id: string
  created_at: string
  full_name: string
  email: string
  password: string
  whatsapp: string | null
}

// ⇩ Tambah 'WARGA' di union type Role
type Role = 'WARGA' | 'MEMBER' | 'TREASURER' | 'ADMIN'

const rupiahDate = (iso: string) => new Date(iso).toLocaleString('id-ID')

export default function AdminRequestsPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [items, setItems] = useState<ReqRow[]>([])
  const [roleChoice, setRoleChoice] = useState<Record<string, Role>>({})

  async function fetchData() {
    setLoading(true); setErr(null)
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) { router.replace('/login'); return }

    const { data, error } = await supabase
      .from('requests')
      .select('id, created_at, full_name, email, password, whatsapp')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) { setErr(error.message); setLoading(false); return }
    setItems((data ?? []) as ReqRow[])
    setLoading(false)
  }

  useEffect(() => { void fetchData() }, [])

  function onRoleChange(id: string, r: Role) {
    setRoleChoice(m => ({ ...m, [id]: r }))
  }

  async function approve(id: string) {
    // default tetap MEMBER kalau admin belum memilih
    const role = roleChoice[id] ?? 'MEMBER'
    try {
      const res = await fetch(`/api/admin/requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }), // ← kini bisa 'WARGA'
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || (j && (j as any).error)) throw new Error((j as any)?.error || 'Gagal approve')
      alert('✅ Request disetujui & user dibuat')
      await fetchData()
    } catch (e) {
      alert('❌ ' + (e instanceof Error ? e.message : 'Gagal approve'))
    }
  }

  async function reject(id: string) {
    if (!confirm('Tolak & hapus request ini?')) return
    try {
      const res = await fetch(`/api/admin/requests/${id}/reject`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || (j && (j as any).error)) throw new Error((j as any)?.error || 'Gagal reject')
      alert('❌ Request ditolak')
      await fetchData()
    } catch (e) {
      alert('❌ ' + (e instanceof Error ? e.message : 'Gagal reject'))
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Request Akun Member</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin')} className="px-3 py-1 rounded border">← Dashboard</button>
          <button onClick={fetchData} className="px-3 py-1 rounded bg-gray-800 text-white">Muat Ulang</button>
        </div>
      </div>

      {loading && <div>Memuat…</div>}
      {err && <div className="text-red-600">❌ {err}</div>}
      {!loading && !err && items.length === 0 && <div className="text-sm text-gray-500">Belum ada request.</div>}

      <div className="rounded-2xl border overflow-hidden">
        <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-2 border-b text-sm font-medium bg-gray-50">
          <div>Tanggal</div>
          <div>Nama</div>
          <div>Email</div>
          <div>WhatsApp</div>
          <div>Role</div>
          <div>Password</div>
          <div className="text-right pr-2">Aksi</div>
        </div>

        <ul className="divide-y">
          {items.map(r => (
            <li key={r.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
              <div className="text-sm text-gray-600">{rupiahDate(r.created_at)}</div>
              <div className="text-sm">{r.full_name}</div>
              <div className="text-sm break-all">{r.email}</div>
              <div className="text-sm break-all">{r.whatsapp ?? '—'}</div>

              <div>
                <select
                  value={roleChoice[r.id] ?? 'MEMBER'}
                  onChange={e => onRoleChange(r.id, e.target.value as Role)}
                  className="rounded border px-2 py-1"
                >
                  {/* ⇩ Tambah opsi WARGA */}
                  <option value="WARGA">WARGA</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="TREASURER">TREASURER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="text-xs text-gray-500 select-all">
                {r.password ? '•••••••• (tersimpan untuk approve)' : '—'}
              </div>

              <div className="flex md:justify-end gap-2">
                <button onClick={() => approve(r.id)} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                  Approve
                </button>
                <button onClick={() => reject(r.id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Approve akan membuat akun di Auth, mengisi <code>public.users</code> beserta role, lalu menghapus request.
      </p>
    </div>
  )
}
