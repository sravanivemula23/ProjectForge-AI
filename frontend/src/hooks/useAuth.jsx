import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '../services/api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  const refresh = useCallback(async () => {
    try { setUser(await api.me()) } catch { tokenStore.clear(); setUser(null) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tokenStore.get()) refresh()
    const onLogout = () => setUser(null)
    window.addEventListener('pf:logout', onLogout)
    return () => window.removeEventListener('pf:logout', onLogout)
  }, [refresh])

  const finish = async (res) => { tokenStore.set(res.access_token); await refresh(); return res.user }
  const value = useMemo(() => ({
    user, loading, refresh,
    login: async (b) => finish(await api.login(b)),
    register: async (b) => finish(await api.register(b)),
    logout: () => { tokenStore.clear(); setUser(null) },
  }), [user, loading, refresh]) // eslint-disable-line
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
