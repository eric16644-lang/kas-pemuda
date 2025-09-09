import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

type Body = { amount?: unknown; screenshot_url?: unknown; checksum?: unknown }
type ApiResp = { ok?: boolean; error?: string }

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
  if (!uid) return NextResponse.json<ApiResp>({ error: 'no-session' }, { status: 401 })

  let body: Body = {}
  try { body = await req.json() } catch {}

  const amount = typeof body.amount === 'number' ? body.amount : NaN
  const screenshot_url =
    typeof body.screenshot_url === 'string' && body.screenshot_url.trim() ? body.screenshot_url.trim() : null
  const checksum =
    typeof body.checksum === 'string' && /^[a-f0-9]{64}$/i.test(body.checksum as string)
      ? (body.checksum as string).toLowerCase()
      : null

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json<ApiResp>({ error: 'amount-required-positive' }, { status: 400 })
  }
  if (!screenshot_url) {
    return NextResponse.json<ApiResp>({ error: 'screenshot_url-required' }, { status: 400 })
  }
  if (!checksum) {
    return NextResponse.json<ApiResp>({ error: 'checksum-required' }, { status: 400 })
  }

  const { error } = await supabase.from('payment_proofs').insert({
    user_id: uid,
    status: 'PENDING',
    amount_input: amount,
    screenshot_url,
    checksum, // <-- WAJIB sesuai schema
  })

  // Tangani kemungkinan unique-violation pada checksum
  if (error) {
    // kode Postgres unique_violation = 23505
    const message = /duplicate key|unique/i.test(error.message)
      ? 'Bukti sudah pernah diunggah (checksum sama).'
      : error.message
    return NextResponse.json<ApiResp>({ error: message }, { status: 500 })
  }

  return NextResponse.json<ApiResp>({ ok: true }, { headers: res.headers })
}
