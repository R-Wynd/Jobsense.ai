import { useQuery } from '@tanstack/react-query'
import { Briefcase, CheckCircle2, Clock, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import { api } from '../api'
import type { PipelineRun } from '../types'
import PipelineControls from './PipelineControls'
import ScheduleControls from './ScheduleControls'
import StatusBadge from './StatusBadge'
import { toIST } from '../utils/time'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface Props {
  onNavigate: (page: 'jobs' | 'runs') => void
}

export default function Dashboard({ onNavigate }: Props) {
  const { data: jobs } = useQuery({
    queryKey: ['jobs', { page: 1, page_size: 5, sort_by: 'ats_score', sort_dir: 'desc' }],
    queryFn: () => api.listJobs({ page: 1, page_size: 5, sort_by: 'ats_score', sort_dir: 'desc' }),
    refetchInterval: 10000,
  })
  const { data: allJobs } = useQuery({
    queryKey: ['jobs-stats'],
    queryFn: () => api.listJobs({ page: 1, page_size: 1 }),
    refetchInterval: 10000,
  })
  const { data: runs } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(5),
    refetchInterval: 5000,
  })
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
    refetchInterval: 30000,
  })

  const appliedJobs = jobs?.items?.filter((j) => j.application_status === 'applied') || []
  const totalJobs = allJobs?.total || 0
  const pendingJobs = jobs?.items?.filter((j) => j.application_status === 'not_applied' && j.processing_status === 'processed') || []
  const avgAts = (() => {
    const scored = (jobs?.items || []).filter((j) => j.ats_score !== null)
    if (!scored.length) return null
    return Math.round(scored.reduce((s, j) => s + (j.ats_score || 0), 0) / scored.length)
  })()

  const latestRun: PipelineRun | undefined = runs?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{getGreeting()}, Aravind 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">Welcome to your job dashboard</p>
      </div>

      {/* Stats banner */}
      <div className="bg-indigo-600 rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-3">Jobs Applied</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tracked', value: totalJobs },
            { label: 'Applied', value: (allJobs?.items || []).filter((j) => j.application_status === 'applied').length || appliedJobs.length },
            { label: 'Ready to Apply', value: pendingJobs.length },
            { label: 'Avg ATS Score', value: avgAts !== null ? `${avgAts}%` : '—' },
          ].map((s, i) => (
            <div key={i} className={`${i < 3 ? 'border-r border-indigo-500 pr-4' : ''}`}>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs text-indigo-200 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API key warning */}
      {health && !health.llm_configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          ⚠ <strong>ANTHROPIC_API_KEY not set.</strong> Resume tailoring and ATS scoring are disabled.
          Set the key in <code className="text-xs bg-amber-100 px-1 rounded">backend/.env</code> and restart.
        </div>
      )}

      {/* Pipeline controls */}
      <PipelineControls />

      {/* Scheduled runs */}
      <ScheduleControls />

      {/* Two-column cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent jobs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Top Scored Jobs</h3>
            <button onClick={() => onNavigate('jobs')} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
              See all <ArrowRight size={11} />
            </button>
          </div>
          {(!jobs?.items?.length) ? (
            <p className="text-sm text-slate-400 text-center py-6">No jobs yet. Run the pipeline!</p>
          ) : (
            <ul className="space-y-2">
              {jobs.items.map((job) => (
                <li key={job.id} className="flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{job.company || '—'}</p>
                    <p className="text-xs text-slate-500 truncate">{job.title}</p>
                  </div>
                  <StatusBadge status={job.application_status} />
                  {job.ats_score !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      job.ats_score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                      job.ats_score >= 50 ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{job.ats_score}%</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent runs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Recent Runs</h3>
            <button onClick={() => onNavigate('runs')} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
              See all <ArrowRight size={11} />
            </button>
          </div>
          {(!runs?.length) ? (
            <p className="text-sm text-slate-400 text-center py-6">No runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    run.status === 'completed' ? 'bg-emerald-400' :
                    run.status === 'running' ? 'bg-blue-400 animate-pulse' :
                    run.status === 'failed' ? 'bg-red-400' : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 truncate">
                      {run.started_at ? toIST(run.started_at) : 'Not started'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600">
                    {run.jobs_processed}/{run.jobs_scraped} jobs
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                    run.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    run.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>{run.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
