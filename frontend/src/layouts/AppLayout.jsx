import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Bookmark, Compass, GitCompare, LayoutDashboard, LogOut, Menu, Search, Shield, User, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/generate', 'Generate ideas', Compass], ['/analyze', 'Analyze an idea', Search],
  ['/library', 'My projects', Bookmark], ['/compare', 'Compare', GitCompare], ['/profile', 'Profile', User],
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const items = user?.role === 'admin' ? [...links, ['/admin', 'Admin', Shield]] : links
  const Nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
      {items.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'}`}>
          <Icon size={18} />{label}
        </NavLink>))}
      <button onClick={() => { logout(); nav('/') }} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white"><LogOut size={18} />Log out</button>
    </nav>
  )
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 font-display text-lg font-bold text-white"><BarChart3 className="text-signal" /> ProjectForge AI</div>{Nav}
      </aside>
      <header className="flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden">
        <span className="font-display font-bold">ProjectForge AI</span>
        <button aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </header>
      {open && <div className="flex flex-col bg-ink p-4 md:hidden">{Nav}</div>}
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  )
}
