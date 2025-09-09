import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  const res = new NextResponse()
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() { return req.cookies.getAll().map(({ name, value }) => ({ name, value })) },
      setAll(cookies) { cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
    },
  })

  const { data: s } = await supabase.auth.getSession()
  if (!s.session) return NextResponse.json({ error: 'no-session' }, { status: 401 })

  // Ambil role untuk membedakan admin/member
  const { data: prof } = await supabase.from('users').select('role').eq('id', s.session.user.id).single()
  const isAdmin = prof?.role === 'ADMIN' || prof?.role === 'TREASURER'

  // Query notifikasi: utk member -> user_id = auth; utk admin -> for_admin = true
  const query = isAdmin
    ? supabase.from('notifications').select('*').eq('for_admin', true).order('created_at', { ascending: false }).limit(50)
    : supabase.from('notifications').select('*').eq('user_id', s.session.user.id).order('created_at', { ascending: false }).limit(50)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hitung unread
  const unread = (data ?? []).filter((n: any) => !n.is_read).length

  return NextResponse.json({ items: data, unread }, { headers: res.headers })
}
