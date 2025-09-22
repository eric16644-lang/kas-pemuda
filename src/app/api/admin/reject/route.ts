import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs' // auth via Node runtime (bukan Edge)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Resp = { ok?: boolean; error?: string }

export async function POST(req: NextRequest) {
  // --- Auth: ambil Bearer token dari header
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json<Resp>({ error: 'Unauthorized' }, { status: 401 })

  // --- Verifikasi token dengan anon client
  const anon = createClient(URL, ANON)
  const { data: ures, error: uerr } = await anon.auth.getUser(token)
  if (uerr || !ures?.user) return NextResponse.json<Resp>({ error: 'Unauthorized' }, { status: 401 })

  // --- Cek role di tabel users via service role
  const admin = supabaseAdmin()
  const { data: me, error: meErr } = await admin
    .from('users')
    .select('id, role')
    .eq('id', ures.user.id)
    .single()

  if (meErr || !me || !['ADMIN', 'TREASURER'].includes(String(me.role))) {
    return NextResponse.json<Resp>({ error: 'Forbidden' }, { status: 403 })
  }

  // --- Body
  const body = await req.json().catch(() => ({} as any))
  const proofId = body?.proofId as string | undefined
  const notes = (body?.notes ?? null) as string | null
  if (!proofId) return NextResponse.json<Resp>({ error: 'proofId wajib' }, { status: 400 })

  // --- Pastikan proof ada & masih PENDING
  const { data: proof, error: pErr } = await admin
    .from('payment_proofs')
    .select('id, status')
    .eq('id', proofId)
    .single()

  if (pErr || !proof) return NextResponse.json<Resp>({ error: 'Proof tidak ditemukan' }, { status: 404 })
  if (proof.status !== 'PENDING') {
    return NextResponse.json<Resp>({ error: 'Status bukan PENDING' }, { status: 400 })
  }

  // --- Update menjadi REJECTED + catat reviewer & waktu & notes
  const { error: updErr } = await admin
    .from('payment_proofs')
    .update({
      status: 'REJECTED',
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      notes: notes,
    })
    .eq('id', proofId)

  if (updErr) return NextResponse.json<Resp>({ error: updErr.message }, { status: 500 })

  return NextResponse.json<Resp>({ ok: true })
}
