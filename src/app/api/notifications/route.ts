import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Role = 'ADMIN' | 'TREASURER' | 'MEMBER'
type NotificationRow = {
  id: number
  kind: string
  title: string
  body: string
  proof_id: string | null
  user_id: string | null
  for_admin: boolean
  is_read: boolean
  created_at: string
}

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

  const { data: prof } = await supabase
    .from('users')
    .select('role')
    .eq('id', s.session.user.id)
    .single()

  const role = (prof?.role ?? 'MEMBER') as Role
  const isAdmin = role === 'ADMIN' || role === 'TREASURER'

  const base = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
  const query = isAdmin ? base.eq('for_admin', true) : base.eq('user_id', s.session.user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items: NotificationRow[] = (data ?? []) as NotificationRow[]
  const unread = items.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0)

  return NextResponse.json({ items, unread }, { headers: res.headers })
}
