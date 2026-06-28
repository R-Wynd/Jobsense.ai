import clsx from 'clsx'

interface Props {
  score: number | null
  size?: 'sm' | 'md'
}

function scoreColor(score: number | null) {
  if (score === null) return 'bg-slate-100 text-slate-500'
  if (score >= 80) return 'bg-emerald-100 text-emerald-700'
  if (score >= 60) return 'bg-blue-100 text-blue-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

export default function AtsScoreBadge({ score, size = 'sm' }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded-full',
        scoreColor(score),
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      )}
    >
      {score !== null ? `${score}%` : '—'}
    </span>
  )
}
