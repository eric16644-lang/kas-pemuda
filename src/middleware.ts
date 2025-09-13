// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const url = new URL(req.url)
  const path = url.pathname

  // Halaman yang perlu proteksi
  const isKas = path.startsWith('/kas')
  const isAdmin = path.startsWith('/admin')
  const isAuthPage = path === '/login' || path.startsWith('/request') || path.startsWith('/requests')

  // Ambil sesi
  const { data: { session } } = await supabase.auth.getSession()

  // Belum login
  if (!session) {
    if (isKas || isAdmin || path === '/beranda') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // Sudah login → cek role user dari tabel public.users
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as 'ADMIN' | 'MEMBER' | 'WARGA' | undefined) ?? 'MEMBER'

  // WARGA: tidak boleh ke /kas & /admin, mendarat di /beranda
  if (role === 'WARGA') {
    if (isKas || isAdmin) {
      return NextResponse.redirect(new URL('/beranda', req.url))
    }
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/beranda', req.url))
    }
    return res
  }

  // MEMBER/ADMIN logged in: blok halaman auth
  if (isAuthPage) {
    return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin' : '/kas', req.url))
  }

  // MEMBER tidak boleh ke /admin
  if (role !== 'ADMIN' && isAdmin) {
    return NextResponse.redirect(new URL('/kas', req.url))
  }

  return res
}

// Kecualikan file statis & image
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api/public).*)',
  ],
}
