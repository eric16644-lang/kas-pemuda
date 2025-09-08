import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anon = createClient(URL, ANON)
  const { data: ures, error: uerr } = await anon.auth.getUser(token)
  if (uerr || !ures?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()
  // cek role
  const { data: me } = await admin.from('users').select('id, role').eq('id', ures.user.id).single()
  if (!me || !['ADMIN','TREASURER'].includes(me.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ambil pending
  const { data: proofs, error } = await admin
    .from('payment_proofs')
    .select('id, user_id, amount_input, transfer_datetime, bank_name, account_last4, screenshot_url, created_at')
    .eq('status','PENDING')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URL kecil (5 menit) untuk preview
  const withSigned = await Promise.all((proofs || []).map(async (p) => {
    let signedUrl: string | null = null
    if (p.screenshot_url) {
      const { data: signed } = await admin.storage
        .from('proofs')
        .createSignedUrl(p.screenshot_url, 60 * 5)
      signedUrl = signed?.signedUrl ?? null
    }
    return { ...p, signedUrl }
  }))

  // ambil nama user (opsional, samarkan di UI kalau perlu)
  const userIds = Array.from(new Set(withSigned.map(p => p.user_id)))
  const { data: users } = await admin.from('users').select('id, full_name').in('id', userIds)

  const usersMap = new Map(users?.map(u => [u.id, u.full_name || 'Anggota']) || [])
  const data = withSigned.map(p => ({
    ...p,
    member_name: usersMap.get(p.user_id) || 'Anggota'
  }))

  return NextResponse.json({ data })
}
