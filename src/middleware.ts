// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getSessionAndRole(req: NextRequest) {
  const res = NextResponse.next()

  // Buat Supabase server client yang sinkron dengan cookies (edge safe)
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      get(name: string) { return req.cookies.get(name)?.value },
      set(name: string, value: string, options: any) {
        // sinkronkan cookie perubahan (misal refresh) ke response
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: '', ...options })
      }
    }
  })

  const { data: sess } = await supabase.auth.getSession()
  const user = sess.session?.user ?? null

  let role: 'ADMIN' | 'TREASURER' | 'MEMBER' | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    role = (profile?.role as any) ?? null
  }

  return { res, user, role }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { res, user, role } = await getSessionAndRole(req)

  const isAdmin = role === 'ADMIN' || role === 'TREASURER'
  const requireAuth = (p: string) => p.startsWith('/setor') || p.startsWith('/admin')

  // 1) Lindungi /admin/*
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (!isAdmin) {
      const url = req.nextUrl.clone()
      url.pathname = '/kas'
      return NextResponse.redirect(url)
    }
    return res
  }

  // 2) Lindungi /setor (wajib login)
  if (pathname.startsWith('/setor')) {
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return res
  }

  // 3) /login: kalau sudah login, arahkan sesuai role
  if (pathname === '/login') {
    if (user) {
      const url = req.nextUrl.clone()
      url.pathname = isAdmin ? '/admin' : '/kas'
      return NextResponse.redirect(url)
    }
    return res
  }

  // default: lanjutkan
  return res
}

// Terapkan middleware hanya ke rute yang perlu
export const config = {
  matcher: ['/', '/login', '/setor', '/admin/:path*'],
}
