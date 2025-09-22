import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Resp = { ok?: boolean; error?: string }
type RejectBody = { proofId?: string; notes?: unknown }

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json<Resp>({ error: 'Unauthorized' }, { status: 401 })

  const anon = createClient(URL, ANON)
  const { data: ures, error: uerr } = await anon.auth.getUser(token)
  if (uerr || !ures?.user) return NextResponse.json<Resp>({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', ures.user.id).single()
  if (meErr || !me || !['ADMIN', 'TREASURER'].includes(String(me.role))) {
    return NextResponse.json<Resp>({ error: 'Forbidden' }, { status: 403 })
  }

  const raw: RejectBody = await req.json().catch(() => ({}))
  const proofId = typeof raw.proofId === 'string' && raw.proofId.trim() ? raw.proofId.trim() : undefined
  const notes =
    typeof raw.notes === 'string'
      ? raw.notes.trim() || null
      : raw.notes == null
        ? null
        : String(raw.notes)

  if (!proofId) return NextResponse.json<Resp>({ error: 'proofId wajib' }, { status: 400 })

  const { data: proof, error: pErr } = await admin
    .from('payment_proofs')
    .select('id, status')
    .eq('id', proofId)
    .single()

  if (pErr || !proof) return NextResponse.json<Resp>({ error: 'Proof tidak ditemukan' }, { status: 404 })
  if (proof.status !== 'PENDING') {
    return NextResponse.json<Resp>({ error: 'Status bukan PENDING' }, { status: 400 })
  }

  const { error: updErr } = await admin
    .from('payment_proofs')
    .update({
      status: 'REJECTED',
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      notes,
    })
    .eq('id', proofId)

  if (updErr) return NextResponse.json<Resp>({ error: updErr.message }, { status: 500 })

  return NextResponse.json<Resp>({ ok: true })
}
