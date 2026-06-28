import { useQuery } from '@tanstack/react-query'
import { History, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { api } from '../api'
import { toIST } from '../utils/time'
import type { PipelineRun } from '../types'

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
      status === 'running' ? 'bg-blue-100 text-blue-700' :
      status === 'failed' ? 'bg-red-100 text-red-600' :
      'bg-slate-100 text-slate-600'
    }`}>
      {status === 'completed' && <CheckCircle2 size={10} />}
      {status === 'running' && <Loader2 size={10} className="animate-spin" />}
      {status === 'failed' && <XCircle size={10} />}
      {status === 'queued' && <Clock size={10} />}
      <span className="capitalize">{status}</span>
    </span>
  )
}

function durationOf(run: PipelineRun): string {
  if (run.started_at && run.finished_at) {
    const s = Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
    return `${s}s`
  }
  return run.status === 'running' ? 'Running…' : '—'
}

export default function RunHistory() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(20),
    refetchInterval: 5000,
  })

  const empty = !isLoading && !runs?.length

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History size={18} /> Run History
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">All pipeline executions</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Mobile cards (below md) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading && <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>}
          {empty && <div className="text-center py-12 text-slate-400 text-sm">No runs yet. Start the pipeline from Dashboard.</div>}
          {runs?.map((run) => (
            <div key={run.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">
                  {run.started_at ? toIST(run.started_at) : '—'}
                </span>
                <StatusPill status={run.status} />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span><span className="font-bold text-slate-700">{run.jobs_scraped}</span> <span className="text-slate-400">scraped</span></span>
                <span><span className="font-bold text-emerald-700">{run.jobs_processed}</span> <span className="text-slate-400">done</span></span>
                <span><span className="font-bold text-red-500">{run.jobs_failed}</span> <span className="text-slate-400">failed</span></span>
                <span className="ml-auto text-slate-500">{durationOf(run)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop table (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Started</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Scraped</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Processed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Failed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Duration</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading…</td></tr>
              )}
              {empty && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No runs yet. Start the pipeline from Dashboard.</td></tr>
              )}
              {runs?.map((run) => (
                <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {run.started_at ? toIST(run.started_at) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={run.status} /></td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{run.jobs_scraped}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700 font-medium">{run.jobs_processed}</td>
                  <td className="px-4 py-3 text-sm text-red-500 font-medium">{run.jobs_failed}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{durationOf(run)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
