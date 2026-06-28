import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Menu, Briefcase } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import JobsTable from './components/JobsTable'
import FunnelChart from './components/FunnelChart'
import RunHistory from './components/RunHistory'
import { api } from './api'

type Page = 'dashboard' | 'jobs' | 'funnel' | 'runs' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [navOpen, setNavOpen] = useState(false)

  const { data: jobsData } = useQuery({
    queryKey: ['jobs-count'],
    queryFn: () => api.listJobs({ page: 1, page_size: 1 }),
    refetchInterval: 15000,
  })

  const goTo = (p: Page) => { setPage(p); setNavOpen(false) }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        current={page}
        onChange={goTo}
        totalJobs={jobsData?.total || 0}
        mobileOpen={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3">
          <button
            onClick={() => setNavOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Briefcase size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">JobSense</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {page === 'dashboard' && (
            <Dashboard onNavigate={(p) => setPage(p)} />
          )}
          {page === 'jobs' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Time to start organizing your jobs! 💪</h1>
                <p className="text-sm text-slate-500 mt-1">Goodluck Aravind!</p>
              </div>
              <JobsTable />
            </div>
          )}
          {page === 'funnel' && <FunnelChart />}
          {page === 'runs' && <RunHistory />}
          {page === 'settings' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">API Key</h3>
                  <p className="text-sm text-slate-500">
                    Set <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code> in{' '}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">jobsense-app/backend/.env</code> and restart the backend.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Profile</h3>
                  <p className="text-sm text-slate-500">
                    Configured for: Aravind Ram — SRE / Platform / Cloud Infrastructure Engineer, 1–3 years experience, India locations.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Resume Assets</h3>
                  <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                    <li>Master resume: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Aravind_SRE_Master_Resume.pdf</code></li>
                    <li>Experience file: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">frsh-contribution.md</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
