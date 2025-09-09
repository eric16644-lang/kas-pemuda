'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Role = 'ADMIN' | 'TREASURER' | 'MEMBER'
type ProfileRow = { id: string; full_name: string | null; role: Role }

export default function ProfilePage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [fullName, setFullName] = useState<string>('')
  const [initialName, setInitialName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const canSaveName = useMemo(
    () => fullName.trim() !== '' && fullName.trim() !== initialName.trim(),
    [fullName, initialName]
  )
  const isAdmin = role === 'ADMIN' || role === 'TREASURER'

  const loadMe = useCallback(async () => {
    setLoading(true); setMsg(null)
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) { router.replace('/login'); return }

    const u = s.session.user
    setUid(u.id); setEmail(u.email ?? null)

    const { data: prof, error } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('id', u.id)
      .single()

    if (error) { setMsg('❌ Gagal memuat profil.'); setLoading(false); return }

    setRole(prof.role)
    setFullName(prof.full_name ?? '')
    setInitialName(prof.full_name ?? '')
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { void loadMe() }, [loadMe])

  const saveName = async () => {
    if (!uid) return
    setSaving(true); setMsg(null)
    try {
      const { error } = await supabase.from('users').update({ full_name: fullName.trim() }).eq('id', uid)
      if (error) throw error
      setMsg('✅ Nama berhasil disimpan.')
      setInitialName(fullName.trim())
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan nama'
      setMsg(`❌ ${message}`)
    } finally { setSaving(false) }
  }

  const changePassword = async () => {
    setMsg(null)
    if (!newPwd || newPwd.length < 6) { setMsg('❌ Password minimal 6 karakter.'); return }
    if (newPwd !== confirmPwd) { setMsg('❌ Konfirmasi password tidak sama.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) setMsg(`❌ ${error.message}`)
    else { setMsg('✅ Password berhasil diubah.'); setNewPwd(''); setConfirmPwd('') }
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace('/login') }

  if (loading) return <div className="max-w-lg mx-auto p-6">Memuat profil…</div>

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profil</h1>
        <button onClick={() => router.push(isAdmin ? '/admin' : '/kas')} className="px-3 py-1 rounded border">
          ← Kembali
        </button>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="rounded-2xl border p-4 space-y-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Email</div>
          <div className="font-medium">{email ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Role</div>
          <div className="font-medium">{role ?? '-'}</div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nama Lengkap</label>
          <input className="border rounded px-3 py-2 w-full" value={fullName}
                 onChange={(e) => setFullName(e.target.value)} placeholder="Nama kamu" />
          <div className="mt-2">
            <button onClick={saveName} disabled={!canSaveName || saving}
                    className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">
              {saving ? 'Menyimpan…' : 'Simpan Nama'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Ubah Password</div>
        <div className="grid grid-cols-1 gap-3">
          <input type="password" className="border rounded px-3 py-2 w-full"
                 placeholder="Password baru (min 6)" value={newPwd}
                 onChange={(e) => setNewPwd(e.target.value)} />
          <input type="password" className="border rounded px-3 py-2 w-full"
                 placeholder="Konfirmasi password baru" value={confirmPwd}
                 onChange={(e) => setConfirmPwd(e.target.value)} />
        </div>
        <button onClick={changePassword} className="px-4 py-2 rounded border">Simpan Password</button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Masuk sebagai: <span className="font-medium">{email ?? '-'}</span></div>
        <button onClick={logout} className="px-4 py-2 rounded border">Logout</button>
      </div>
    </div>
  )
}
