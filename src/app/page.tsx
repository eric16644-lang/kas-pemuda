// src/app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Verifikasi diperlukan</h1>
        <p className="text-gray-600 mb-6">Silakan masuk untuk melanjutkan.</p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded bg-black text-white"
        >
          Login
        </Link>
      </div>
    </main>
  )
}
