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
    const id = setInterval(fetchNotif, 15000)
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
        className="relative px-3 py-2 rounded border bg-gray-800 text-white"
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
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg z-20">
          <div className="flex items-center justify-between p-2 border-b border-gray-700">
            <div className="font-medium">Notifikasi</div>
            <button
              onClick={markAllRead}
              className="text-sm text-blue-400 hover:underline"
            >
              Tandai semua dibaca
            </button>
          </div>

          {loading && <div className="p-3 text-sm text-gray-400">Memuat…</div>}
          {!loading && items.length === 0 && (
            <div className="p-3 text-sm text-gray-400">Tidak ada notifikasi.</div>
          )}

          <ul className="divide-y divide-gray-700">
            {items.map((n) => (
              <li key={n.id} className="p-3 hover:bg-gray-800 transition">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-sm text-gray-200">{n.body}</div>
                {!n.is_read && <div className="text-[10px] text-blue-400 mt-1">• Baru</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
