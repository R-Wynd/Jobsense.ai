import clsx from 'clsx'
import { STATUS_BADGES, STATUS_LABELS } from '../utils/status'

const STATUS_STYLES: Record<string, string> = {
  ...STATUS_BADGES,
  scraped: 'bg-blue-50 text-blue-600',
  tailoring: 'bg-purple-100 text-purple-700',
  scored: 'bg-cyan-100 text-cyan-700',
  processed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-600',
  queued: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const LABELS: Record<string, string> = {
  ...STATUS_LABELS,
  scraped: 'Scraped',
  tailoring: 'Tailoring',
  scored: 'Scored',
  processed: 'Ready',
  failed: 'Failed',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
}

interface Props {
  status: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        STATUS_STYLES[status] || 'bg-slate-100 text-slate-600',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      )}
    >
      {LABELS[status] || status}
    </span>
  )
}
