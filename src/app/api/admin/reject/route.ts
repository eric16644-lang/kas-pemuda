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

  const { proofId, notes } = await req.json()
  if (!proofId) return NextResponse.json({ error: 'proofId wajib' }, { status: 400 })

  const { error } = await admin
    .from('payment_proofs')
    .update({ status: 'REJECTED', reviewed_by: me.id, reviewed_at: new Date().toISOString(), notes: notes ?? null })
    .eq('id', proofId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
