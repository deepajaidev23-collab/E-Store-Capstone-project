import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>
  signUp: (email: string, password: string, displayName: string) => ReturnType<typeof supabase.auth.signUp>
  signOut: () => ReturnType<typeof supabase.auth.signOut>
}

// eslint-disable-next-line react-refresh/only-export-components -- context object export alongside component is intentional
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        // Re-arm loading for the one render cycle during sign-out so
        // AuthGuard renders a spinner instead of briefly flashing protected
        // content before the redirect.
        setLoading(true)
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(
    (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    [],
  )

  const signUp = useCallback(
    (email: string, password: string, displayName: string) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      }),
    [],
  )

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
