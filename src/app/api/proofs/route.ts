import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  // Bearer token dari client
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve user dari token
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: userRes, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = userRes.user

  // Ambil form-data
  const form = await req.formData()
  const amountStr = String(form.get('amount') ?? '')
  const transferDatetime = form.get('transferDatetime')?.toString() || null
  const bankName = form.get('bankName')?.toString() || null
  const accountLast4 = form.get('accountLast4')?.toString() || null
  const file = form.get('screenshot') as File | null

  // Validasi
  const amount = Number(amountStr)
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal tidak valid' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'Screenshot wajib' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Maksimal 5MB' }, { status: 400 })
  const allowed = ['image/jpeg', 'image/png']
  if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Format harus JPG/PNG' }, { status: 400 })

  // Checksum
  const arrayBuf = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

  // Upload Storage
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`

  const admin = supabaseAdmin()
  const { error: uploadErr } = await admin.storage
    .from('proofs')
    .upload(objectPath, buffer, { contentType: file.type, upsert: false })
  if (uploadErr) return NextResponse.json({ error: `Upload gagal: ${uploadErr.message}` }, { status: 500 })

  // Insert DB
  const { error: insertErr } = await admin.from('payment_proofs').insert({
    user_id: user.id,
    amount_input: amount,
    transfer_datetime: transferDatetime,
    bank_name: bankName,
    account_last4: accountLast4,
    screenshot_url: objectPath,
    checksum,
    status: 'PENDING'
  })
  if (insertErr) {
    await admin.storage.from('proofs').remove([objectPath])
    return NextResponse.json({ error: `DB insert gagal: ${insertErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Bukti dikirim, menunggu verifikasi.' })
}
