import type { Job, PaginatedJobs, PipelineRun, HealthStatus, JobQuery, FunnelData, ScheduleData } from './types'

// In dev, VITE_API_URL is unset → '/api' uses the Vite proxy (vite.config.ts).
// In production (e.g. Vercel), set VITE_API_URL to your backend origin,
// e.g. https://jobsense-api.onrender.com → requests go to <origin>/api/...
const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: (): Promise<HealthStatus> => request('/health'),

  getFunnel: (): Promise<FunnelData> => request('/funnel'),

  getSchedule: (): Promise<ScheduleData> => request('/schedule'),
  startSchedule: (interval_hours: number): Promise<ScheduleData> =>
    request('/schedule', { method: 'POST', body: JSON.stringify({ interval_hours }) }),
  stopSchedule: (): Promise<ScheduleData> => request('/schedule', { method: 'DELETE' }),

  startRun: (params?: { scrape_only?: boolean; max_concurrency?: number; enable_ats?: boolean }): Promise<{ run_id: string; status: string }> =>
    request('/runs', { method: 'POST', body: JSON.stringify(params || {}) }),

  getRun: (runId: string): Promise<PipelineRun> => request(`/runs/${runId}`),

  listRuns: (limit = 10): Promise<PipelineRun[]> => request(`/runs?limit=${limit}`),

  listJobs: (q: JobQuery = {}): Promise<PaginatedJobs> => {
    const params = new URLSearchParams()
    if (q.application_status) params.set('application_status', q.application_status)
    if (q.min_ats_score !== undefined) params.set('min_ats_score', String(q.min_ats_score))
    if (q.location) params.set('location', q.location)
    if (q.min_tech_match !== undefined) params.set('min_tech_match', String(q.min_tech_match))
    if (q.search) params.set('search', q.search)
    if (q.sort_by) params.set('sort_by', q.sort_by)
    if (q.sort_dir) params.set('sort_dir', q.sort_dir)
    if (q.page) params.set('page', String(q.page))
    if (q.page_size) params.set('page_size', String(q.page_size))
    return request(`/jobs?${params.toString()}`)
  },

  getJob: (jobId: string): Promise<Job> => request(`/jobs/${jobId}`),

  updateJobStatus: (jobId: string, status: string): Promise<Job> =>
    request(`/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify({ application_status: status }) }),

  reprocessJob: (jobId: string): Promise<{ job_id: string; run_id: string }> =>
    request(`/jobs/${jobId}/reprocess`, { method: 'POST' }),

  resumeDownloadUrl: (jobId: string) => `${BASE}/jobs/${jobId}/resume`,
  resumePdfUrl: (jobId: string) => `${BASE}/jobs/${jobId}/resume/pdf`,

  getResumeContent: (jobId: string): Promise<{ content: string; job_id: string; title: string; company: string }> =>
    request(`/jobs/${jobId}/resume/content`),

  saveResumeContent: (jobId: string, content: string): Promise<{ ok: boolean }> =>
    request(`/jobs/${jobId}/resume/content`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
}
