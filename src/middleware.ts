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
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const url = req.nextUrl
  const pathname = url.pathname

  // Lewatkan aset/statik
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/api/public') // contoh API publik
  ) {
    return res
  }

  // Ambil user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rute publik (tanpa login)
  const publicRoutes = new Set<string>(['/login', '/request'])
  const isPublic = [...publicRoutes].some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!user) {
    // Belum login → boleh akses public saja
    if (isPublic) return res
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Sudah login → ambil role dari public.users
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role || 'MEMBER') as 'ADMIN' | 'MEMBER' | 'WARGA'

  // Redirect default saat buka root
  if (pathname === '/') {
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url))
    if (role === 'WARGA') return NextResponse.redirect(new URL('/beranda', req.url))
    return NextResponse.redirect(new URL('/kas', req.url)) // MEMBER
  }

  // Proteksi /admin → hanya ADMIN
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      const to = role === 'WARGA' ? '/beranda' : '/kas'
      return NextResponse.redirect(new URL(to, req.url))
    }
  }

  // Proteksi /kas → WARGA tidak boleh
  if (pathname.startsWith('/kas')) {
    if (role === 'WARGA') {
      return NextResponse.redirect(new URL('/beranda', req.url))
    }
  }

  // Proteksi /beranda → khusus WARGA, yang lain diarahkan ke dashboardnya
  if (pathname.startsWith('/beranda')) {
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url))
    if (role === 'MEMBER') return NextResponse.redirect(new URL('/kas', req.url))
  }

  return res
}

export const config = {
  matcher: [
    // amankan semua halaman app kecuali file statik
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(png|jpg|jpeg|svg|gif|webp)).*)',
  ],
}
