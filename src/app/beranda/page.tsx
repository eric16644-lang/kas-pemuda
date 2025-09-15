// src/app/beranda/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Role = 'WARGA' | 'MEMBER' | 'TREASURER' | 'ADMIN'

export default function BerandaPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [open, setOpen] = useState(false) // sidebar mobile
  const [fullName, setFullName] = useState<string>('User')
  const [role, setRole] = useState<Role>('WARGA')

  useEffect(() => {
    (async () => {
      // cek session
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/login')
        return
      }

      // ambil profile & role
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', s.session.user.id)
        .maybeSingle()

      const r = (profile?.role as Role | undefined) ?? 'MEMBER'
      setRole(r)
      setFullName(profile?.full_name || 'User')

      // jika bukan WARGA, arahkan ke halaman perannya
      if (r === 'ADMIN') {
        router.replace('/admin')
      } else if (r === 'MEMBER' || r === 'TREASURER') {
        router.replace('/kas')
      }
      // kalau WARGA, tetap di /beranda
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // menu kiri (dummy link)
  const sideMenu = [
    { label: 'Beranda', href: '/beranda', active: true },
    { label: 'Kegiatan', href: '/beranda/kegiatan' },
    { label: 'Info Pekerjaan', href: '/beranda/kegiatan' },
    { label: 'Info Kepengurusan', href: '/beranda/kegiatan' },
    { label: 'Transparansi Keuangan', href: '/beranda/keuangan' },
    { label: 'Edit Profile', href: '/profile' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-blue-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded hover:bg-blue-600/60 focus:outline-none"
              aria-label="Buka menu"
            >
              <span className="text-xl">☰</span>
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png" // ganti sesuai aset Anda
                alt="Logo"
                width={34}
                height={34}
                className="rounded-full bg-white/90 p-1"
              />
              <div className="font-semibold tracking-wide">
  Blok <span className="opacity-90">Astana</span>
              <div className="text-xs font-normal leading-tight">
    DESA TALAGA WETAN
  </div>
  </div>
  </div>
          </div>

          {/* Menu top (dummy) */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#" className="hover:underline">Info</a>
          </nav>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-64 shrink-0 bg-neutral-900 text-white min-h-[calc(100vh-3.5rem)]">
          <div className="h-16 flex items-center justify-center border-b border-white/10 text-2xl font-extrabold">
            MENU
          </div>
          <nav className="py-2">
            {sideMenu.map((m) => (
              <a
                key={m.label}
                href={m.href}
                className={`block px-6 py-3 text-sm ${
                  m.active
                    ? 'bg-neutral-800/80 font-semibold'
                    : 'hover:bg-neutral-800/60'
                }`}
              >
                {m.label}
              </a>
            ))}
            <div className="mt-4 px-4">
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 text-sm font-semibold"
              >
                Log Out
              </button>
            </div>
          </nav>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-neutral-900 text-white shadow-xl">
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
                <span className="font-semibold">MENU</span>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded hover:bg-white/10"
                  aria-label="Tutup menu"
                >
                  ✕
                </button>
              </div>
              <nav className="py-2">
                {sideMenu.map((m) => (
                  <a
                    key={m.label}
                    href={m.href}
                    onClick={() => setOpen(false)}
                    className={`block px-5 py-3 text-sm ${
                      m.active
                        ? 'bg-neutral-800/80 font-semibold'
                        : 'hover:bg-neutral-800/60'
                    }`}
                  >
                    {m.label}
                  </a>
                ))}
                <div className="mt-4 px-4 pb-4">
                  <button
                    onClick={logout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 text-sm font-semibold"
                  >
                    Log Out
                  </button>
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] bg-gray-100 dark:bg-gray-900 p-6">
          <div className="rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 md:p-10 h-full">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-extrabold text-blue-700">
                Selamat Datang, {fullName}
              </h1>
              <p className="mt-3 text-base md:text-lg font-semibold">
                di Website Blok Astana
              </p>

              <div className="mt-10 flex justify-center">
                <Image
                  src="/logo.png" // ganti sesuai aset Anda
                  alt="Lambang"
                  width={300}
                  height={300}
                  className="w-52 md:w-72 h-auto object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
