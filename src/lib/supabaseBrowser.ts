// src/lib/supabaseBrowser.ts
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseBrowser = () =>
  createPagesBrowserClient({ supabaseUrl: url, supabaseKey: anon })
