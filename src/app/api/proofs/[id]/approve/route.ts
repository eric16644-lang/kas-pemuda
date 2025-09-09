import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

type LedgerType = 'CREDIT' | 'DEBIT'
interface LedgerInsert {
  user_id: string
  type: LedgerType
  amount: number
  note?: string | null
  proof_id?: string | null
  source: 'PROOF' // gunakan enum yang sudah kamu tambahkan
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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

  // Auth & role
  const { data: s } = await supabase.auth.getSession()
  const adminId = s.session?.user.id
  if (!adminId) return NextResponse.json({ error: 'no-session' }, { status: 401 })

  const { data: me, error: eMe } = await supabase
    .from('users').select('role').eq('id', adminId).single()
  if (eMe) return NextResponse.json({ error: eMe.message }, { status: 500 })
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'TREASURER'
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Ambil proof
  const { data: proof, error: eProof } = await supabase
    .from('payment_proofs')
    .select('id, user_id')
    .eq('id', proofId)
    .single()
  if (eProof || !proof) {
    return NextResponse.json({ error: eProof?.message || 'proof-not-found' }, { status: 404 })
  }

  // Cek ledger existing
  const { data: existingLedger, error: eL } = await supabase
    .from('ledger')
    .select('id')
    .eq('proof_id', proofId)
    .limit(1)
  if (eL) return NextResponse.json({ error: eL.message }, { status: 500 })

  // Update status proof → APPROVED
  const { error: eUpd } = await supabase
    .from('payment_proofs')
    .update({ status: 'APPROVED' })
    .eq('id', proofId)
  if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 500 })

  // Insert / update ledger
  const payload: LedgerInsert = {
    user_id: proof.user_id,
    type: 'CREDIT',
    amount: 0,
    note: 'Setoran Kas telah disetujui oleh Admin',
    proof_id: proofId,
    source: 'PROOF',
  }

  if (!existingLedger || existingLedger.length === 0) {
    const { error: eIns } = await supabase.from('ledger').insert(payload)
    if (eIns) return NextResponse.json({ error: eIns.message }, { status: 500 })
  } else {
    const { error: eUpdLed } = await supabase
      .from('ledger')
      .update(payload)
      .eq('proof_id', proofId)
    if (eUpdLed) {
      // non-fatal; kalau mau strict bisa return error
    }
  }

  return NextResponse.json({ ok: true }, { headers: res.headers })
}
