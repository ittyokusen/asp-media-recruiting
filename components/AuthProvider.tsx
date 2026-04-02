'use client'

import { createContext, useContext } from 'react'

import type { AuthUser } from '@/lib/auth'

type AuthContextValue = {
  user: AuthUser | null
  canWrite: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  canWrite: false,
})

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser | null
  children: React.ReactNode
}) {
  return (
    <AuthContext.Provider
      value={{
        user,
        canWrite: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
