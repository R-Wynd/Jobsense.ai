import { useState, useEffect } from 'react'
import { Play, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { PipelineRun } from '../types'
import { toIST } from '../utils/time'

const STORAGE_KEY = 'jobsense_active_run_id'

export default function PipelineControls() {
  const qc = useQueryClient()
  const [scrapeOnly, setScrapeOnly] = useState(false)
  const [enableAts, setEnableAts] = useState(false)

  // Persist active run ID in localStorage so it survives page navigation / refresh
  const [activeRunId, setActiveRunIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  )

  function setActiveRunId(id: string | null) {
    setActiveRunIdState(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  const startMutation = useMutation({
    mutationFn: () => api.startRun({ scrape_only: scrapeOnly, max_concurrency: 3, enable_ats: enableAts }),
    onSuccess: (data) => {
      setActiveRunId(data.run_id)
      qc.invalidateQueries({ queryKey: ['runs'] })
    },
  })

  // Poll the active run from the DB — survives refresh because ID is in localStorage
  const { data: runDetail } = useQuery<PipelineRun>({
    queryKey: ['run', activeRunId],
    queryFn: () => api.getRun(activeRunId!),
    enabled: !!activeRunId,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      if (s === 'running' || s === 'queued') return 2000
      return false
    },
  })

  // On mount, if we have a stored run ID and it's already done, clear it
  useEffect(() => {
    if (runDetail?.status === 'completed' || runDetail?.status === 'failed') {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['runs'] })
    }
  }, [runDetail?.status, qc])

  // If page was refreshed and the stored run is now terminal, still show it but allow re-run
  const isRunning = runDetail?.status === 'running' || runDetail?.status === 'queued'

  const progress = runDetail
    ? runDetail.jobs_scraped > 0
      ? Math.round(100 * (runDetail.jobs_processed + runDetail.jobs_failed) / runDetail.jobs_scraped)
      : isRunning ? 10 : 100
    : 0

  const phaseLabel = () => {
    if (!runDetail) return ''
    if (runDetail.status === 'queued') return 'Queued…'
    if (runDetail.status === 'running') {
      if (runDetail.jobs_scraped === 0) return 'Scraping jobs…'
      return `Matching resumes… ${runDetail.jobs_processed}/${runDetail.jobs_scraped} done`
    }
    if (runDetail.status === 'completed') {
      const t = runDetail.finished_at ? ` · finished ${toIST(runDetail.finished_at)}` : ''
      return `Done${t}`
    }
    return 'Failed'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Zap size={16} className="text-indigo-500" />
            Daily Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Scrape jobs → match resume → show results
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={scrapeOnly}
              onChange={(e) => setScrapeOnly(e.target.checked)} className="rounded" />
            Scrape only
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={enableAts}
              onChange={(e) => setEnableAts(e.target.checked)} className="rounded" />
            ATS Score
          </label>
          <button
            onClick={() => startMutation.mutate()}
            disabled={isRunning || startMutation.isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {isRunning
              ? <Loader2 size={14} className="animate-spin" />
              : <Play size={14} />}
            {isRunning ? 'Running…' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {startMutation.isError && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {(startMutation.error as Error).message}
        </p>
      )}

      {runDetail && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              {runDetail.status === 'completed' && <CheckCircle2 size={12} className="text-emerald-500" />}
              {runDetail.status === 'failed'    && <XCircle size={12} className="text-red-500" />}
              {isRunning                         && <Loader2 size={12} className="animate-spin text-indigo-500" />}
              <span>{phaseLabel()}</span>
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                runDetail.status === 'failed'    ? 'bg-red-400' :
                runDetail.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {runDetail.status === 'completed' && (
            <p className="text-xs text-slate-500 mt-1.5">
              ✓ {runDetail.jobs_processed} matched · {runDetail.jobs_failed} failed
              {runDetail.jobs_scraped > 0 && ` · ${runDetail.jobs_scraped} scraped`}
            </p>
          )}
          {runDetail.status === 'failed' && runDetail.error && (
            <p className="text-xs text-red-600 mt-1.5">{runDetail.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
