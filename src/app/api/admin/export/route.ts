// src/app/api/admin/export/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin' // << konsisten lowercase

type LedgerRow = {
  id: string
  created_at: string
  kind: 'CREDIT' | 'DEBIT'
  amount: number
  note: string | null
  source: string | null
  user_id: string | null
}

type UserRow = {
  id: string
  full_name: string | null
}

// Helper: format ke CSV aman (escape koma & quote)
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const month = url.searchParams.get('month') // eks: 2025-09

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Param month wajib format YYYY-MM' }, { status: 400 })
    }

    // Hitung rentang [start, end) UTC
    const [y, m] = month.split('-').map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
    end.setUTCMonth(end.getUTCMonth() + 1)

    const admin = supabaseAdmin()

    // Ambil transaksi dari ledger dalam rentang bulan
    const { data: rowsRaw, error } = await admin
      .from('ledger')
      .select('id, created_at, kind, amount, note, source, user_id')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows: LedgerRow[] = (rowsRaw ?? []) as LedgerRow[]

    // Ambil nama member (opsional; jika tabel users punya kolom full_name)
    const userIds = Array.from(new Set(rows.map((r: LedgerRow) => r.user_id).filter(Boolean))) as string[]
    const nameMap = new Map<string, string | null>()

    if (userIds.length > 0) {
      const { data: users, error: uerr } = await admin
        .from('users')
        .select('id, full_name')
        .in('id', userIds)

      if (!uerr && users) {
        for (const u of users as UserRow[]) {
          nameMap.set(u.id, u.full_name ?? null)
        }
      }
    }

    // Susun CSV
    const header = [
      'ID',
      'Tanggal (Local)',
      'Tanggal (UTC)',
      'Jenis',          // CREDIT / DEBIT
      'Jumlah',
      'Sumber',         // MANUAL / PROOF / ADJUSTMENT, dsb
      'User ID',
      'Nama',
      'Catatan',
    ]

    const lines = [header.map(csvEscape).join(',')]

    for (const r of rows) {
      const dt = new Date(r.created_at)
      const local = dt.toLocaleString('id-ID') // tampilan lokal
      const utc = dt.toISOString()             // standar UTC

      const nama = r.user_id ? (nameMap.get(r.user_id) ?? '') : ''
      lines.push([
        csvEscape(r.id),
        csvEscape(local),
        csvEscape(utc),
        csvEscape(r.kind),
        csvEscape(r.amount),
        csvEscape(r.source ?? ''),
        csvEscape(r.user_id ?? ''),
        csvEscape(nama),
        csvEscape(r.note ?? ''),
      ].join(','))
    }

    const csv = lines.join('\n')
    const filename = `ledger-${month}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export gagal'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
