// src/app/api/public/summary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function parseMonthRange(month?: string) {
  // month format: "YYYY-MM"
  if (!month) return null
  const m = month.trim()
  if (!/^\d{4}-\d{2}$/.test(m)) return null
  const [y, mm] = m.split('-').map(Number)
  const start = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(y, mm, 1, 0, 0, 0)) // next month
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(req: NextRequest) {
  const db = supabaseAdmin()
  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get('month') || undefined
  const range = parseMonthRange(monthParam)

  // 1) total saldo keseluruhan (tidak terbatas bulan)
  const { data: bal, error: balErr } = await db
    .from('balance_summary')
    .select('total_balance')
    .single()
  if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 })

  // 2) ambil transaksi (20 terbaru) sesuai filter (kalau ada month, filter per bulan)
  let ledgerQuery = db
    .from('ledger')
    .select('created_at, type, amount, memo')
    .order('created_at', { ascending: false })
    .limit(20)

  if (range) {
    ledgerQuery = db
      .from('ledger')
      .select('created_at, type, amount, memo')
      .gte('created_at', range.start)
      .lt('created_at', range.end)
      .order('created_at', { ascending: false })
      .limit(20)
  }

  const { data: rows, error: ledErr } = await ledgerQuery
  if (ledErr) return NextResponse.json({ error: ledErr.message }, { status: 500 })

  // 3) hitung rekap per-bulan (kredit, debit, net). Jika tidak ada month, pakai bulan berjalan.
  const now = new Date()
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const forMonth = monthParam || defaultMonth
  const monthRange = parseMonthRange(forMonth)!

  // gunakan SQL agregasi untuk akurasi
  const { data: agg, error: aggErr } = await db
    .rpc('ledger_month_aggregate', { start_ts: monthRange.start, end_ts: monthRange.end })
  // Jika function belum ada, kita fallback di JS (lihat di bawah)
  let monthly = { credit: 0, debit: 0, net: 0 }

  if (!aggErr && agg && Array.isArray(agg) && agg[0]) {
    monthly = {
      credit: Number(agg[0].credit || 0),
      debit: Number(agg[0].debit || 0),
      net: Number((agg[0].credit || 0) - (agg[0].debit || 0)),
    }
  } else {
    // Fallback hitung via query biasa (kalau belum buat RPC)
    const { data: monthRows, error: monthErr } = await db
      .from('ledger')
      .select('type, amount')
      .gte('created_at', monthRange.start)
      .lt('created_at', monthRange.end)

    if (monthErr) return NextResponse.json({ error: monthErr.message }, { status: 500 })
    const credit = (monthRows || []).filter(r => r.type === 'CREDIT').reduce((a, b) => a + Number(b.amount), 0)
    const debit = (monthRows || []).filter(r => r.type === 'DEBIT').reduce((a, b) => a + Number(b.amount), 0)
    monthly = { credit, debit, net: credit - debit }
  }

  const data = {
    month: forMonth,                 // YYYY-MM
    total_all_time: bal?.total_balance ?? 0,
    monthly,                         // { credit, debit, net }
    recent: (rows ?? []).map(r => ({
      at: r.created_at,
      kind: r.type,                  // 'CREDIT' | 'DEBIT'
      amount: r.amount,
      note: r.memo ?? null,
    })),
  }

  return new NextResponse(JSON.stringify({ data }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=15' },
  })
}
