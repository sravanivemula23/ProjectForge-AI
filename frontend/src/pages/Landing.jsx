import { Link } from 'react-router-dom'
import { BarChart3, Compass, FileText, FlaskConical, GitCompare, Map, Search, Sparkles } from 'lucide-react'
import ScoreRing from '../components/ScoreRing'

const steps = ['Profile & preferences', 'Ranked ideas', 'Search GitHub & papers', 'Novelty score', 'Innovation gaps', 'Improved proposal', 'Roadmap & report']
const features = [
  [Compass, 'Personalised recommendations', 'At least five ideas ranked against your skills, time, budget, hardware and career goal.'],
  [FlaskConical, 'Novelty analysis', 'Embeddings compare your idea with real repositories and papers - similarity, common features, missing features.'],
  [Search, 'Verified vs suggested', 'Every external source is labelled verified; AI suggestions are labelled as suggestions. Nothing is invented.'],
  [Sparkles, 'Improve this project', 'Turn a basic idea into a stronger one and see exactly what was added and why.'],
  [GitCompare, 'Compare up to 3', 'Radar and bar charts across novelty, difficulty, cost, time, career and research value.'],
  [Map, 'Roadmap & architecture', 'Eleven development phases, system architecture, database schema and AI pipeline.'],
  [FileText, 'Report generator', 'Abstract, README, resume line, PPT outline, viva questions and interview answers.'],
]
const stack = ['React + Vite + Tailwind', 'Node.js + Express', 'MongoDB + Mongoose', 'Atlas Vector Search', 'Embeddings + cosine similarity', 'LLM structured JSON (zod-validated)', 'GitHub · Semantic Scholar · OpenAlex · arXiv · Crossref', 'JWT + bcrypt', 'Docker']

export default function Landing() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 font-display text-xl font-bold"><BarChart3 className="text-signal" /> ProjectForge AI</div>
        <nav className="flex items-center gap-3 text-sm"><a href="#how" className="hidden sm:inline">How it works</a><a href="#features" className="hidden sm:inline">Features</a><Link to="/login" className="btn-ghost">Log in</Link><Link to="/register" className="btn-primary">Get started</Link></nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-[1.05] md:text-6xl">Know how original your project is before you build it.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-500">Chatbots hand you ideas. ProjectForge checks them against real GitHub repositories and research papers, shows what already exists, and tells you what to add to make it stronger.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link to="/register" className="btn-signal !px-6 !py-3">Analyze my idea</Link><Link to="/login" className="btn-ghost !px-6 !py-3">Try the demo account</Link></div>
          <p className="mt-4 text-sm text-ink-500">Scores are estimates from retrievable sources - never a guarantee of uniqueness.</p>
        </div>
        <div className="card shadow-sm" aria-label="Example novelty report (illustrative)">
          <div className="mb-1 text-xs text-ink-500">Example output · illustrative values</div>
          <h3 className="font-display text-lg font-bold">AI-based bone fracture detection using Vision Transformer</h3>
          <div className="my-5 flex items-center justify-around"><ScoreRing value={62} label="Existing similarity %" size={104} /><ScoreRing value={74} label="Estimated novelty" size={104} /></div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><div className="font-semibold">Existing work commonly uses</div><ul className="mt-1 list-disc pl-5 text-ink-500"><li>CNN backbones</li><li>X-ray images</li><li>Binary classification</li></ul></div>
            <div><div className="font-semibold text-signal-dark">Possible innovation</div><ul className="mt-1 list-disc pl-5 text-ink-500"><li>Multi-fracture classes</li><li>Attention / Grad-CAM</li><li>Severity estimation</li></ul></div></div>
        </div>
      </section>

      <section className="bg-ink py-14 text-white"><div className="mx-auto max-w-6xl px-4"><h2 className="text-2xl font-bold md:text-3xl">The problem with project ideas today</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3 text-ink-300">
          <p>Project websites recycle the same lists - attendance systems, chat apps, e-commerce.</p><p>AI chatbots suggest ideas but rarely check whether they already exist or how strong they are.</p><p>Students discover the overlap late - during a viva, an interview, or a plagiarism review.</p></div></div></section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-14"><h2 className="text-2xl font-bold md:text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map((s, i) => <li key={s} className="card"><div className="text-sm text-ink-500">Step {i + 1}</div><div className="font-semibold">{s}</div></li>)}</ol></section>

      <section id="features" className="mx-auto max-w-6xl px-4 pb-14"><h2 className="text-2xl font-bold md:text-3xl">What you get</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, t, d]) => <div key={t} className="card"><Icon className="mb-3 text-signal" size={22} /><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-ink-500">{d}</p></div>)}</div></section>

      <section className="mx-auto max-w-6xl px-4 pb-14"><h2 className="text-2xl font-bold md:text-3xl">Built for</h2>
        <p className="mt-3 max-w-3xl text-ink-500">Final-year students, internship candidates, hackathon teams, beginners and anyone building a portfolio project that needs to stand out and be defended confidently.</p>
        <div className="mt-6 flex flex-wrap gap-2">{stack.map((s) => <span key={s} className="rounded-full border border-ink-100 bg-white px-3 py-1 text-sm">{s}</span>)}</div></section>

      <section className="mx-auto max-w-6xl px-4 pb-16"><div className="card flex flex-wrap items-center justify-between gap-4 !bg-signal-light"><div><h2 className="text-2xl font-bold">Find out where your idea stands.</h2><p className="text-ink-700">Free to run locally. Bring your own API keys.</p></div><Link to="/register" className="btn-primary !px-6 !py-3">Create free account</Link></div></section>
      <footer className="border-t border-ink-100 py-6 text-center text-sm text-ink-500">© {new Date().getFullYear()} ProjectForge AI · Novelty values are estimates, not guarantees.</footer>
    </div>
  )
}
