import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './ui'

export default function ProtectedRoute({ children, admin = false }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}
