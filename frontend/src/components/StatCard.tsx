interface Props {
  label: string
  value: number | string
  sub?: string
  highlight?: boolean
}

export default function StatCard({ label, value, sub, highlight }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-4 ${highlight ? '' : 'border-r border-indigo-400/30 last:border-0'}`}>
      <span className="text-3xl font-bold text-white leading-none">{value}</span>
      <span className="text-xs text-indigo-200 mt-1">{sub || label}</span>
    </div>
  )
}
