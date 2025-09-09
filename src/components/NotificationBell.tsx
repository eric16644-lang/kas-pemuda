'use client'
import { useEffect, useState } from 'react'

type Notif = {
  id: number
  kind: string
  title: string
  body: string
  created_at: string
  is_read: boolean
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotif = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setItems(json.items ?? [])
        setUnread(json.unread ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotif()
    const id = setInterval(fetchNotif, 15000) // polling 15 detik
    return () => clearInterval(id)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    await fetchNotif()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative px-3 py-2 rounded border"
        title="Notifikasi"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white border rounded-lg shadow-lg z-20">
          <div className="flex items-center justify-between p-2 border-b">
            <div className="font-medium">Notifikasi</div>
            <button onClick={markAllRead} className="text-sm underline">Tandai semua dibaca</button>
          </div>

          {loading && <div className="p-3 text-sm">Memuat…</div>}
          {!loading && items.length === 0 && (
            <div className="p-3 text-sm text-gray-500">Tidak ada notifikasi.</div>
          )}

          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(n.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-sm">{n.body}</div>
                {!n.is_read && <div className="text-[10px] text-blue-600 mt-1">• Baru</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
