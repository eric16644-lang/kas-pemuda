// src/app/api/proofs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  // 1) Ambil user dari cookie Supabase (server-side)
  const cookieStore = cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options })
      }
    }
  })

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Ambil form-data
  const form = await req.formData()
  const amountStr = String(form.get('amount') ?? '')
  const transferDatetime = form.get('transferDatetime')?.toString() || null
  const bankName = form.get('bankName')?.toString() || null
  const accountLast4 = form.get('accountLast4')?.toString() || null
  const file = form.get('screenshot') as File | null

  // 3) Validasi input
  const amount = Number(amountStr)
  if (!amount || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal tidak valid' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'Screenshot wajib' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Maksimal 5MB' }, { status: 400 })
  }
  const allowed = ['image/jpeg', 'image/png']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Format harus JPG/PNG' }, { status: 400 })
  }

  // 4) Hitung checksum (deteksi duplikat)
  const arrayBuf = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

  // 5) Upload ke Storage (bucket private: proofs) dengan path <userId>/<uuid>.<ext>
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`

  // gunakan service role utk upload (bypass policy, tapi kita tetap disiplin path user)
  const admin = supabaseAdmin()
  const { error: uploadErr } = await admin.storage
    .from('proofs')
    .upload(objectPath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: `Upload gagal: ${uploadErr.message}` }, { status: 500 })
  }

  // 6) Insert ke payment_proofs (status PENDING)
  const { error: insertErr } = await admin.from('payment_proofs').insert({
    user_id: user.id,
    amount_input: amount,
    transfer_datetime: transferDatetime,
    bank_name: bankName,
    account_last4: accountLast4,
    screenshot_url: objectPath, // simpan path internal saja
    checksum,
    status: 'PENDING'
  })

  if (insertErr) {
    // rollback sederhana: hapus file jika DB gagal (opsional)
    await admin.storage.from('proofs').remove([objectPath])
    return NextResponse.json({ error: `DB insert gagal: ${insertErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Bukti dikirim, menunggu verifikasi.' })
}
