import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Resp = { ok?: boolean; error?: string }
type ApproveBody = { proofId?: string; amount?: unknown }

function toPositiveInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v)
  if (typeof v === 'string') {
    const n = Number(v.replace?.(/\D+/g, '') ?? v)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  return null
}

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

  const raw: ApproveBody = await req.json().catch(() => ({}))
  const proofId = typeof raw.proofId === 'string' && raw.proofId.trim() ? raw.proofId.trim() : undefined
  if (!proofId) return NextResponse.json<Resp>({ error: 'proofId wajib' }, { status: 400 })
  const bodyAmount = toPositiveInt(raw.amount)

  const { data: proof, error: pErr } = await admin
    .from('payment_proofs')
    .select('id, user_id, amount_input, status')
    .eq('id', proofId)
    .single()

  if (pErr || !proof) return NextResponse.json<Resp>({ error: 'Proof tidak ditemukan' }, { status: 404 })
  if (proof.status !== 'PENDING') return NextResponse.json<Resp>({ error: 'Status bukan PENDING' }, { status: 400 })

  // Jika amount_input masih null dan client mengirim amount valid → set dulu
  if ((proof.amount_input === null || proof.amount_input === undefined) && bodyAmount) {
    const { error: setAmtErr } = await admin
      .from('payment_proofs')
      .update({ amount_input: bodyAmount })
      .eq('id', proofId)
    if (setAmtErr) return NextResponse.json<Resp>({ error: setAmtErr.message }, { status: 500 })
    proof.amount_input = bodyAmount
  }

  if (typeof proof.amount_input !== 'number' || !Number.isFinite(proof.amount_input) || proof.amount_input <= 0) {
    return NextResponse.json<Resp>({ error: 'Nominal belum diisi / tidak valid' }, { status: 400 })
  }

  const { error: updErr } = await admin
    .from('payment_proofs')
    .update({ status: 'APPROVED', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq('id', proofId)
  if (updErr) return NextResponse.json<Resp>({ error: updErr.message }, { status: 500 })

  const { error: ledErr } = await admin.from('ledger').insert({
    type: 'CREDIT',
    source: 'MANUAL_APPROVAL',
    user_id: proof.user_id,
    proof_id: proof.id,
    amount: proof.amount_input,
    memo: 'Setoran kas disetujui (manual)',
  })
  if (ledErr) return NextResponse.json<Resp>({ error: ledErr.message }, { status: 500 })

  return NextResponse.json<Resp>({ ok: true })
}
