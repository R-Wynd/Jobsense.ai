// Canonical application statuses — single source of truth for dropdowns + badges.
// Order mirrors backend app/funnel.py (pipeline order).

import type { ApplicationStatus } from '../types'

export interface StatusMeta {
  value: ApplicationStatus
  label: string
  badge: string // tailwind classes
}

export const APPLICATION_STATUSES: StatusMeta[] = [
  { value: 'not_applied',    label: 'Not Applied',    badge: 'bg-slate-100 text-slate-600' },
  { value: 'skipped',        label: 'Skip',           badge: 'bg-rose-100 text-rose-600' },
  { value: 'applied',        label: 'Applied',        badge: 'bg-green-100 text-green-700' },
  { value: 'round_1',        label: 'Round 1',        badge: 'bg-indigo-100 text-indigo-700' },
  { value: 'round_2',        label: 'Round 2',        badge: 'bg-indigo-100 text-indigo-700' },
  { value: 'round_3',        label: 'Round N',        badge: 'bg-indigo-100 text-indigo-700' },
  { value: 'no_advance',     label: 'No Advance',     badge: 'bg-amber-100 text-amber-700' },
  { value: 'pending',        label: 'Pending',        badge: 'bg-cyan-100 text-cyan-700' },
  { value: 'offer',          label: 'Offer',          badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'offer_accepted', label: 'Offer Accepted', badge: 'bg-emerald-200 text-emerald-800' },
  { value: 'offer_declined', label: 'Offer Declined', badge: 'bg-orange-100 text-orange-700' },
  { value: 'rejected',       label: 'Rejected',       badge: 'bg-red-100 text-red-600' },
  { value: 'ghosted',        label: 'Ghosted',        badge: 'bg-zinc-200 text-zinc-700' },
  { value: 'withdrew',       label: 'Withdrew',       badge: 'bg-amber-100 text-amber-800' },
]

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  APPLICATION_STATUSES.map((s) => [s.value, s.label])
)
export const STATUS_BADGES: Record<string, string> = Object.fromEntries(
  APPLICATION_STATUSES.map((s) => [s.value, s.badge])
)
