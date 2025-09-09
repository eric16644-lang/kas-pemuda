import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ← Next.js 15: params adalah Promise
) {
  const { id: proofId } = await context.params

  const res = new NextResponse()
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getAll() { return (req.cookies.getAll() as any[]).map(({ name, value }: any) => ({ name, value })) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAll(cookies: any[]) { cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
    },
  })

  // 1) Auth & role
  const { data: s } = await supabase.auth.getSession()
  const adminId = s.session?.user.id
  if (!adminId) return NextResponse.json({ error: 'no-session' }, { status: 401 })

  const { data: me, error: eMe } = await supabase
    .from('users')
    .select('role')
    .eq('id', adminId)
    .single()
  if (eMe) return NextResponse.json({ error: eMe.message }, { status: 500 })
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'TREASURER'
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 2) Update status → REJECTED
  const { error: eUpd } = await supabase
    .from('payment_proofs')
    .update({ status: 'REJECTED' })
    .eq('id', proofId)
  if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 500 })

  // 3) Hapus ledger terkait proof (jika ada)
  const { error: eDel } = await supabase.from('ledger').delete().eq('proof_id', proofId)
  if (eDel) {
    // non-fatal; boleh diabaikan
  }

  return NextResponse.json({ ok: true }, { headers: res.headers })
}
