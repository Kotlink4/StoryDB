import { Activity, Database, FileWarning, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import '../styles/style-tokens.css'
import './AdminApp.css'

const adminSections = [
  { icon: Activity, label: 'System' },
  { icon: Database, label: 'Projects' },
  { icon: FileWarning, label: 'Storage' },
  { icon: ShieldCheck, label: 'Audit' },
]

export function AdminApp() {
  return (
    <main className="admin-app">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div>
          <p className="admin-kicker">StoryDB</p>
          <h1>Admin</h1>
        </div>
        <nav>
          {adminSections.map(({ icon: Icon, label }) => (
            <button key={label} type="button">
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <Link className="admin-link" to="/style-preview">
          Workspace
        </Link>
      </aside>
      <section className="admin-main">
        <header>
          <p className="admin-kicker">Preparation</p>
          <h2>Administration</h2>
        </header>
        <div className="admin-grid" aria-label="Administration overview">
          {adminSections.map(({ icon: Icon, label }) => (
            <article key={label} className="admin-card">
              <Icon aria-hidden="true" size={22} />
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default AdminApp
