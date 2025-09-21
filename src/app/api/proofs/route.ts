// src/app/api/proofs/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'
// (opsional, jika kamu pernah set ke edge)
// export const runtime = 'nodejs'

type Body = { amount?: unknown; screenshot_url?: unknown; checksum?: unknown }
type ApiResp = { ok?: boolean; error?: string }

export async function POST(req: NextRequest) {
  const res = new NextResponse()

  // ✅ Gunakan get/set/remove (BUKAN getAll/setAll)
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: Parameters<typeof res.cookies.set>[2]) {
        res.cookies.set(name, value, options)
      },
      remove(name: string, options: Parameters<typeof res.cookies.set>[2]) {
        res.cookies.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })

  const { data: s } = await supabase.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) {
    return NextResponse.json<ApiResp>({ error: 'no-session' }, { status: 401, headers: res.headers })
  }

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
    return NextResponse.json<ApiResp>({ error: 'amount-required-positive' }, { status: 400, headers: res.headers })
  }
  if (!screenshot_url) {
    return NextResponse.json<ApiResp>({ error: 'screenshot_url-required' }, { status: 400, headers: res.headers })
  }
  if (!checksum) {
    return NextResponse.json<ApiResp>({ error: 'checksum-required' }, { status: 400, headers: res.headers })
  }

  const { error } = await supabase.from('payment_proofs').insert({
    user_id: uid,
    status: 'PENDING',
    amount_input: amount,
    screenshot_url,
    checksum,
  })

  if (error) {
    const message = /duplicate key|unique/i.test(error.message)
      ? 'Bukti sudah pernah diunggah (checksum sama).'
      : error.message
    return NextResponse.json<ApiResp>({ error: message }, { status: 500, headers: res.headers })
  }

  return NextResponse.json<ApiResp>({ ok: true }, { headers: res.headers })
}
