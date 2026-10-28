import { Link, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import { Login, Register, Forgot } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Generate from './pages/Generate'
import Analyze from './pages/Analyze'
import ProjectDetail from './pages/ProjectDetail'
import Library from './pages/Library'
import Compare from './pages/Compare'
import Admin from './pages/Admin'

const NotFound = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-3"><h1 className="text-3xl font-bold">Page not found</h1><Link className="btn-primary" to="/">Go home</Link></div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<Forgot />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/library" element={<Library />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/admin" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
