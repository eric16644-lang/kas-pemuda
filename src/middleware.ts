// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Role = 'ADMIN' | 'TREASURER' | 'MEMBER'

async function getSessionAndRole(req: NextRequest) {
  const res = NextResponse.next()

  // Versi cookies untuk @supabase/ssr terbaru: getAll / setAll
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }))
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: sess } = await supabase.auth.getSession()
  const user = sess.session?.user ?? null

  let role: Role | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    role = (profile?.role as Role | undefined) ?? null
  }

  return { res, user, role }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { res, user, role } = await getSessionAndRole(req)

  const isAdmin = role === 'ADMIN' || role === 'TREASURER'

  // /admin/* → wajib login & admin
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

  // /setor → wajib login
  if (pathname.startsWith('/setor')) {
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return res
  }

  // /profile → wajib login
  if (pathname.startsWith('/profile')) {
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return res
  }

  // /login → kalau sudah login, arahkan sesuai role
  if (pathname === '/login') {
    if (user) {
      const url = req.nextUrl.clone()
      url.pathname = isAdmin ? '/admin' : '/kas'
      return NextResponse.redirect(url)
    }
    return res
  }

  // default
  return res
}

export const config = {
  matcher: ['/', '/login', '/setor', '/profile', '/admin/:path*'],
}
