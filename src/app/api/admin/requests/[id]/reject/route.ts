import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Catatan: di Next.js 15, context.params adalah Promise
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const admin = supabaseAdmin()
  const { id } = await context.params

  try {
    const { error } = await admin.from('requests').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
