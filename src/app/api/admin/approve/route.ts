import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anon = createClient(URL, ANON)
  const { data: ures, error: uerr } = await anon.auth.getUser(token)
  if (uerr || !ures?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: me } = await admin.from('users').select('id, role').eq('id', ures.user.id).single()
  if (!me || !['ADMIN','TREASURER'].includes(me.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { proofId } = await req.json()
  if (!proofId) return NextResponse.json({ error: 'proofId wajib' }, { status: 400 })

  const { data: proof, error: pErr } = await admin
    .from('payment_proofs')
    .select('id, user_id, amount_input, status')
    .eq('id', proofId)
    .single()
  if (pErr || !proof) return NextResponse.json({ error: 'Proof tidak ditemukan' }, { status: 404 })
  if (proof.status !== 'PENDING') return NextResponse.json({ error: 'Status bukan PENDING' }, { status: 400 })

  const { error: updErr } = await admin
    .from('payment_proofs')
    .update({ status: 'APPROVED', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq('id', proofId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const { error: ledErr } = await admin.from('ledger').insert({
    type: 'CREDIT',
    source: 'MANUAL_APPROVAL',
    user_id: proof.user_id,
    proof_id: proof.id,
    amount: proof.amount_input,
    memo: 'Setoran kas disetujui (manual)'
  })
  if (ledErr) return NextResponse.json({ error: ledErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
