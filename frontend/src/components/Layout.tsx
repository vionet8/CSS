import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Image, BookOpen, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'プロジェクト', icon: FolderOpen },
  { to: '/images', label: '画像管理', icon: Image },
  { to: '/docs', label: '使い方', icon: BookOpen },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <>
      <div className="px-5 py-4 border-b border-gray-800">
        <h1 className="text-sm font-bold text-brand-500 uppercase tracking-widest">CSS</h1>
        <p className="text-xs text-gray-500 mt-0.5">Content Structure Studio</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800 text-xs text-gray-600">v0.1.0</div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex-col">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-brand-500 uppercase tracking-widest">CSS</span>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
