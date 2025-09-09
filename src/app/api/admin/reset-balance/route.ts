// src/app/api/admin/reset-balance/route.ts
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

  // Hitung saldo saat ini (tiping data agar tidak pakai any)
type Row = { amount: number; kind: 'CREDIT' | 'DEBIT' }

const { data: agg, error: aggErr } = await svc
  .from('ledger')
  .select('amount, kind')

if (aggErr) {
  return NextResponse.json({ error: aggErr.message }, { status: 500 })
}

const rows = (agg as Row[]) ?? []
const balance = rows.reduce((acc, row) => {
  return acc + (row.kind === 'CREDIT' ? Number(row.amount) : -Number(row.amount))
}, 0)


  // Masukkan entry penyesuaian kebalikan saldo agar total jadi 0
  const adjustKind = balance > 0 ? 'DEBIT' : 'CREDIT'
  const adjustAmount = Math.abs(balance)

  const { error: insErr } = await svc.from('ledger').insert({
    kind: adjustKind,
    amount: adjustAmount,
    note: 'Penyesuaian: reset saldo ke 0',
    source: 'ADJUSTMENT',
  })

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, applied: { kind: adjustKind, amount: adjustAmount } }, { headers: res.headers })
}
