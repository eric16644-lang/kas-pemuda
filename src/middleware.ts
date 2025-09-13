// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  )

  const url = new URL(req.url)
  const path = url.pathname

  const isKas = path.startsWith('/kas')
  const isAdmin = path.startsWith('/admin')
  const isAuthPage = path === '/login' || path.startsWith('/request') || path.startsWith('/requests')

  // Ambil sesi user
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    if (isKas || isAdmin || path === '/beranda') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // Ambil role user dari tabel `users`
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as 'ADMIN' | 'MEMBER' | 'WARGA' | undefined) ?? 'MEMBER'

  // ✅ Role WARGA
  if (role === 'WARGA') {
    if (isKas || isAdmin) {
      return NextResponse.redirect(new URL('/beranda', req.url))
    }
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/beranda', req.url))
    }
    return res
  }

  // ✅ Role MEMBER / ADMIN
  if (isAuthPage) {
    return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin' : '/kas', req.url))
  }

  if (role !== 'ADMIN' && isAdmin) {
    return NextResponse.redirect(new URL('/kas', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api/public).*)',
  ],
}
