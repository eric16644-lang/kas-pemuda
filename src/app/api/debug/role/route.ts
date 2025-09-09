import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  const res = new NextResponse()

  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() { return req.cookies.getAll().map(({ name, value }) => ({ name, value })) },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: s } = await supabase.auth.getSession()
  if (!s.session) return NextResponse.json({ error: 'no-session' }, { status: 401 })

  const uid = s.session.user.id
  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', uid)
    .single()

  return NextResponse.json({ uid, role: profile?.role ?? null, error: error?.message ?? null })
}
