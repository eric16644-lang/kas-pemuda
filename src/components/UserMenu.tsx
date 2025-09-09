'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Role = 'ADMIN' | 'TREASURER' | 'MEMBER'

export default function UserMenu() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) return
      const u = s.session.user
      setEmail(u.email ?? '')
      const { data: prof } = await supabase.from('users').select('full_name, role').eq('id', u.id).single()
      setFullName((prof?.full_name ?? '').trim())
      setRole((prof?.role as Role | undefined) ?? null)
    })()
  }, [supabase])

  const initials = useMemo(() => {
    const src = fullName || email || ''
    if (!src) return '?'
    const parts = fullName ? fullName.split(/\s+/) : [email]
    const chars = parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '')
    return chars.join('')
  }, [fullName, email])

  const logout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    router.replace('/login')
  }

  // close dropdown ketika klik di luar (opsional kecil)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest?.('[data-user-menu-root]')) setOpen(false)
    }
    if (open) document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  return (
    <div className="relative" data-user-menu-root>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative rounded-full border border-gray-600 bg-gray-800 text-white w-10 h-10 flex items-center justify-center select-none"
        title={fullName || email}
      >
        <span className="font-semibold text-sm">{initials || 'U'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg z-30 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700">
            <div className="text-sm font-semibold truncate">{fullName || email || 'Pengguna'}</div>
            {role && <div className="text-[11px] text-gray-400">Role: {role}</div>}
          </div>

          <ul className="py-1">
            <li>
              <button
                onClick={() => { setOpen(false); router.push('/profile') }}
                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm"
              >
                Profil
              </button>
            </li>
            <li>
              <button
                onClick={() => { setOpen(false); router.push('/riwayat') }}
                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm"
              >
                Riwayat Submit
              </button>
            </li>
            <li className="border-t border-gray-700 mt-1">
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm text-red-300"
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
