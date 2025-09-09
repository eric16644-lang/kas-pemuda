import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const res = new NextResponse()
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getAll() { return (req.cookies.getAll() as any[]).map(({ name, value }: any) => ({ name, value })) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAll(cookies: any[]) { cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
    },
  })

  const { data: s } = await supabase.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) return NextResponse.json({ error: 'no-session' }, { status: 401 })

  // body: { amount: number, screenshot_url: string }
  let body: { amount?: unknown; screenshot_url?: unknown } = {}
  try { body = await req.json() } catch {}
  const amount = typeof body.amount === 'number' ? body.amount : NaN
  const screenshot_url = typeof body.screenshot_url === 'string' && body.screenshot_url.trim()
    ? body.screenshot_url.trim()
    : null

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount-required-positive' }, { status: 400 })
  }
  if (!screenshot_url) {
    return NextResponse.json({ error: 'screenshot_url-required' }, { status: 400 })
  }

  const { error } = await supabase.from('payment_proofs').insert({
    user_id: uid,
    status: 'PENDING',
    amount_input: amount,     // sesuai schema kamu (NOT NULL)
    screenshot_url,           // sesuai schema kamu (NOT NULL)
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { headers: res.headers })
}
