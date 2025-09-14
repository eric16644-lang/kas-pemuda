import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Role = 'WARGA' | 'MEMBER' | 'TREASURER' | 'ADMIN'

// Catatan: di Next.js 15, context.params adalah Promise
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = supabaseAdmin()
  const { id } = await context.params

  try {
    const { role }: { role?: Role } = await req.json().catch(() => ({}))
    const wantedRole: Role = role ?? 'MEMBER'

    // 1) Ambil data request
    const { data: r, error: er1 } = await admin
      .from('requests')
      .select('id, full_name, email, password, whatsapp')
      .eq('id', id)
      .single()

    if (er1 || !r) {
      return NextResponse.json({ error: er1?.message || 'Request tidak ditemukan' }, { status: 400 })
    }

    // 2) Buat user Auth (email_confirm=true agar langsung aktif)
    const { data: created, error: er2 } = await admin.auth.admin.createUser({
      email: r.email,
      password: r.password,
      email_confirm: true,
      user_metadata: { full_name: r.full_name, whatsapp: r.whatsapp ?? null }
    })
    if (er2 || !created?.user) {
      return NextResponse.json({ error: er2?.message || 'Gagal membuat user auth' }, { status: 400 })
    }

    const uid = created.user.id

    // 3) Insert ke public.users dengan role
    const { error: er3 } = await admin
      .from('users')
      .insert([{ id: uid, full_name: r.full_name, role: wantedRole }])

    if (er3) {
      // rollback user auth jika gagal insert ke users
      await admin.auth.admin.deleteUser(uid).catch(() => {})
      return NextResponse.json({ error: er3.message }, { status: 400 })
    }

    // 4) Hapus baris request
    await admin.from('requests').delete().eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
