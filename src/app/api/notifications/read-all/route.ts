import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Role = 'ADMIN' | 'TREASURER' | 'MEMBER'

export async function POST(req: NextRequest) {
  const res = new NextResponse()
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() { return req.cookies.getAll().map(({ name, value }) => ({ name, value })) },
      setAll(cookies) { cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
    },
  })

  const { data: s } = await supabase.auth.getSession()
  if (!s.session) return NextResponse.json({ error: 'no-session' }, { status: 401 })

  const { data: prof } = await supabase.from('users').select('role').eq('id', s.session.user.id).single()
  const role = (prof?.role ?? 'MEMBER') as Role
  const isAdmin = role === 'ADMIN' || role === 'TREASURER'

  const update = isAdmin
    ? supabase.from('notifications').update({ is_read: true }).eq('for_admin', true).eq('is_read', false)
    : supabase.from('notifications').update({ is_read: true }).eq('user_id', s.session.user.id).eq('is_read', false)

  const { error } = await update
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { headers: res.headers })
}
