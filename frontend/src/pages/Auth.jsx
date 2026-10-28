import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BarChart3 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { Field, Notice, Spinner } from '../components/ui'

function Shell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold"><BarChart3 className="text-signal" /> ProjectForge AI</Link>
        <div className="card"><h1 className="text-2xl font-bold">{title}</h1><p className="mb-5 text-sm text-ink-500">{subtitle}</p>{children}</div>
      </div>
    </div>
  )
}

export function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation()
  const [f, setF] = useState({ email: '', password: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await login(f); toast.success('Welcome back'); nav(loc.state?.from || '/dashboard') } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Log in" subtitle="Continue to your projects.">
      <form onSubmit={submit} className="space-y-4">
        {err && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <Field label="Email" id="email"><input id="email" type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" id="password"><input id="password" type="password" required className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Log in</button>
        <div className="flex justify-between text-sm"><Link className="text-iris" to="/forgot-password">Forgot password?</Link><Link className="text-iris" to="/register">Create account</Link></div>
        <button type="button" className="btn-ghost w-full" onClick={() => setF({ email: 'demo@projectforge.ai', password: 'Demo@12345' })}>Fill demo credentials</button>
      </form>
    </Shell>
  )
}

export function Register() {
  const { register } = useAuth(); const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (f.password.length < 8 || !/\d/.test(f.password) || !/[A-Za-z]/.test(f.password)) return setErr('Password needs 8+ characters with letters and numbers')
    setBusy(true)
    try { await register(f); toast.success('Account created'); nav('/profile') } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Create your account" subtitle="Start with your profile, then generate ideas.">
      <form onSubmit={submit} className="space-y-4">
        {err && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <Field label="Full name" id="name"><input id="name" required minLength={2} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email" id="email"><input id="email" type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" id="password" hint="At least 8 characters, letters and numbers."><input id="password" type="password" required className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Create account</button>
        <p className="text-center text-sm">Already registered? <Link className="text-iris" to="/login">Log in</Link></p>
      </form>
    </Shell>
  )
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(null); const [token, setToken] = useState(''); const [pw, setPw] = useState(''); const [done, setDone] = useState(false)
  const send = async (e) => { e.preventDefault(); try { const r = await api.forgot({ email }); setMsg(r.message); if (r.dev_reset_token) setToken(r.dev_reset_token) } catch (x) { toast.error(x.message) } }
  const reset = async (e) => { e.preventDefault(); try { await api.reset({ token, password: pw }); setDone(true); toast.success('Password updated') } catch (x) { toast.error(x.message) } }
  return (
    <Shell title="Reset password" subtitle="We'll send a reset link if the email exists.">
      {done ? <Notice>Password updated. <Link className="text-iris" to="/login">Log in</Link></Notice> : (
        <div className="space-y-4">
          <form onSubmit={send} className="space-y-3"><Field label="Email" id="fe"><input id="fe" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field><button className="btn-primary w-full">Send reset link</button></form>
          {msg && <Notice>{msg}</Notice>}
          {token && <form onSubmit={reset} className="space-y-3 border-t pt-4"><Notice tone="warn">Development mode: email delivery is not configured, so the token is shown here.</Notice>
            <Field label="Token" id="tk"><input id="tk" className="input font-mono text-xs" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
            <Field label="New password" id="np"><input id="np" type="password" minLength={8} required className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></Field><button className="btn-signal w-full">Set new password</button></form>}
        </div>)}
    </Shell>
  )
}
