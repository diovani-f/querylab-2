"use client"

import { useAuth } from "@/hooks/use-auth"

export function AuthDebug() {
  const auth = useAuth()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Hydrated: {auth.isHydrated ? '✅' : '❌'}</div>
        <div>Loading: {auth.isLoading ? '⏳' : '✅'}</div>
        <div>Checking Auth: {auth.isCheckingAuth ? '⏳' : '✅'}</div>
        <div>Authenticated: {auth.isAuthenticated ? '✅' : '❌'}</div>
        <div>Has Token: {auth.token ? '✅' : '❌'}</div>
        <div>Has User: {auth.user ? '✅' : '❌'}</div>
        {auth.user && (
          <div>User: {auth.user.nome} ({auth.user.email})</div>
        )}
        {auth.error && (
          <div className="text-red-400">Error: {auth.error}</div>
        )}
      </div>
    </div>
  )
}
