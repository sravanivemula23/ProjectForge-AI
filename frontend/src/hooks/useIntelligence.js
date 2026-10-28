import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../services/api'

/** Loads the stored 2.0 analysis for a project and runs individual analysis steps on demand (never blocks the page). */
export function useIntelligence(projectId) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState('')
  const reload = useCallback(async () => { try { setData(await api.intelligence(projectId)) } catch { setData({}) } }, [projectId])
  useEffect(() => { setData(null); reload() }, [reload])
  const run = useCallback(async (name, fn) => {
    setBusy(name)
    try { await fn(); await reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }, [reload])
  return { data, busy, reload, run }
}
