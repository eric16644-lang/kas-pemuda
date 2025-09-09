// src/app/api/admin/wipe/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function assertAdmin(req: NextRequest) {
  const res = new NextResponse()
  const sb = createServerClient(URL, ANON, {
    cookies: {
      getAll() { return req.cookies.getAll().map(({ name, value }) => ({ name, value })) },
      setAll(cookies) { cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
    },
  })
  const { data: s } = await sb.auth.getSession()
  if (!s.session) return { res, isAdmin: false }
  const uid = s.session.user.id
  const { data: profile } = await sb.from('users').select('role').eq('id', uid).single()
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'TREASURER'
  return { res, isAdmin }
}

export async function POST(req: NextRequest) {
  const { res, isAdmin } = await assertAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const svc = createClient(URL, SERVICE)

  // Hapus semua riwayat transaksi (ledger)
  const { error } = await svc.from('ledger').delete().not('id', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { headers: res.headers })
}
