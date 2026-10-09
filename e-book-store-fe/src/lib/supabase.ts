import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (import.meta.env.DEV) {
  if (!supabaseUrl || supabaseUrl === 'your-supabase-url') {
    console.warn('[Bibliophile] VITE_SUPABASE_URL is not set. Set it in .env.local.')
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key') {
    console.warn('[Bibliophile] VITE_SUPABASE_ANON_KEY is not set. Set it in .env.local.')
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/** Convenience type for use in repository constructors */
export type { SupabaseClient } from '@supabase/supabase-js'
