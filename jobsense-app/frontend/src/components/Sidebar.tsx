import { LayoutDashboard, Briefcase, Target, History, Settings, GitFork, X } from 'lucide-react'
import clsx from 'clsx'

type Page = 'dashboard' | 'jobs' | 'funnel' | 'runs' | 'settings'

interface Props {
  current: Page
  onChange: (p: Page) => void
  totalJobs: number
  mobileOpen: boolean
  onClose: () => void
}

const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'jobs' as Page, label: 'Job Tracker', icon: Target },
  { id: 'funnel' as Page, label: 'Funnel', icon: GitFork },
  { id: 'runs' as Page, label: 'Run History', icon: History },
  { id: 'settings' as Page, label: 'Settings', icon: Settings },
]

export default function Sidebar({ current, onChange, totalJobs, mobileOpen, onClose }: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-200',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col',
          'transform transition-transform duration-200 md:static md:translate-x-0 md:z-auto md:min-h-screen',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Briefcase size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm leading-tight">
            JobSense<br />
            <span className="text-xs font-normal text-slate-500">AI Pipeline</span>
          </span>
          {/* Close (mobile only) */}
          <button
            onClick={onClose}
            className="ml-auto md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
              current === id
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Icon size={16} />
            {label}
            {id === 'jobs' && totalJobs > 0 && (
              <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                {totalJobs}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">Aravind Ram</p>
            <p className="text-xs text-slate-500 truncate">SRE / Platform</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}
