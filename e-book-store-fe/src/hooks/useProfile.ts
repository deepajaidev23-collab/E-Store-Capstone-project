/**
 * useProfile — reads the current user's row from the `profiles` table.
 *
 * Separated from AuthContext deliberately: AuthContext owns Supabase Auth
 * state (User/Session). The `profiles` table is database data and belongs in
 * react-query, not in a context that re-runs on every auth state change.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/user'

export function useProfile() {
  const { user } = useAuth()

  return useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })
}
