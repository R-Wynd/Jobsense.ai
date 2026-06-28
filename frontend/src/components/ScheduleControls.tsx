import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Play, Square, RefreshCw, Loader2 } from 'lucide-react'
import { api } from '../api'
import { toIST } from '../utils/time'

export default function ScheduleControls() {
  const qc = useQueryClient()
  const [hours, setHours] = useState('6')

  const { data } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.getSchedule(),
    refetchInterval: 10000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['schedule'] })
    qc.invalidateQueries({ queryKey: ['runs'] })
    qc.invalidateQueries({ queryKey: ['jobs'] })
  }

  const start = useMutation({
    mutationFn: () => api.startSchedule(Number(hours)),
    onSuccess: invalidate,
  })
  const stop = useMutation({
    mutationFn: () => api.stopSchedule(),
    onSuccess: invalidate,
  })

  const enabled = data?.enabled
  const validHours = Number(hours) > 0
  const busy = start.isPending || stop.isPending

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            Scheduled Runs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-run the pipeline every few hours. New jobs land in Job Tracker (no duplicates).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-20 text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-xs text-slate-500">hours</span>
          </div>

          {enabled ? (
            <>
              <button
                onClick={() => start.mutate()}
                disabled={!validHours || busy}
                title="Apply new interval and run now"
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={14} /> Update
              </button>
              <button
                onClick={() => stop.mutate()}
                disabled={busy}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50"
              >
                <Square size={13} /> Stop
              </button>
            </>
          ) : (
            <button
              onClick={() => start.mutate()}
              disabled={!validHours || busy}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Start
            </button>
          )}
        </div>
      </div>

      {enabled && (
        <div className="mt-3 text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="font-medium">Running every {data?.interval_hours} h</span>
          {data?.next_run_at && <span className="text-emerald-600">· next ≈ {toIST(data.next_run_at)}</span>}
          {data?.last_run_at && <span className="text-emerald-600">· last {toIST(data.last_run_at)}</span>}
        </div>
      )}

      {(start.isError || stop.isError) && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {((start.error || stop.error) as Error)?.message}
        </p>
      )}
    </div>
  )
}
