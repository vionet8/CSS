import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Image, BookOpen } from 'lucide-react'

const navItems = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'プロジェクト', icon: FolderOpen },
  { to: '/images', label: '画像管理', icon: Image },
  { to: '/docs', label: '使い方', icon: BookOpen },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
