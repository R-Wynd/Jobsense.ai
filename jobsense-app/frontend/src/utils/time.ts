/**
 * All time display helpers — always render in IST (Asia/Kolkata, UTC+5:30).
 *
 * The backend now appends +00:00 to all datetime strings so JS always
 * parses them as UTC. These helpers then convert to IST for display.
 */

const IST = 'Asia/Kolkata'

/**
 * Normalise a datetime string so JS always treats it as UTC.
 * Handles: "2026-06-28T16:46:33+00:00" (new), "2026-06-28T16:46:33" (legacy bare)
 */
function toUtcDate(value: string): Date {
  // Already has tz info — parse as-is
  if (value.includes('+') || value.endsWith('Z')) {
    return new Date(value)
  }
  // Bare string (legacy) — append Z so JS treats it as UTC
  return new Date(value + 'Z')
}

/** "28 Jun 2026, 11:34 AM" */
export function toIST(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return toUtcDate(value).toLocaleString('en-IN', {
      timeZone: IST,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return value
  }
}

/** "28 Jun 2026" (date only, no time) */
export function toISTDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return toUtcDate(value).toLocaleDateString('en-IN', {
      timeZone: IST,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

/** "11:34 AM" (time only, IST) */
export function toISTTime(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return toUtcDate(value).toLocaleTimeString('en-IN', {
      timeZone: IST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return value
  }
}

/** Relative: "2h ago", "just now", "3d ago" */
export function relativeIST(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    const diff = Date.now() - toUtcDate(value).getTime()
    if (diff < 0) return 'just now'
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}d ago`
    const mo = Math.floor(d / 30)
    return `${mo}mo ago`
  } catch {
    return value
  }
}
