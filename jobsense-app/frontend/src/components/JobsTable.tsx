import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, ExternalLink, Eye, ChevronLeft, ChevronRight, Filter, FileText, Search, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { Job, JobQuery, ApplicationStatus } from '../types'
import StatusBadge from './StatusBadge'
import JobDetailDrawer from './JobDetailDrawer'
import { toIST, relativeIST } from '../utils/time'
import { APPLICATION_STATUSES } from '../utils/status'

function SiteIcon({ site }: { site: string | null }) {
  const s = (site || '').toLowerCase()
  const colors: Record<string, string> = {
    linkedin: 'bg-blue-600', indeed: 'bg-indigo-500',
    glassdoor: 'bg-green-500', naukri: 'bg-orange-500',
  }
  const initials: Record<string, string> = {
    linkedin: 'Li', indeed: 'In', glassdoor: 'Gl', naukri: 'Na',
  }
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold flex-shrink-0 ${colors[s] || 'bg-slate-400'}`}>
      {initials[s] || (s?.[0]?.toUpperCase() || '?')}
    </span>
  )
}

/** Pick the best career URL: direct > aggregator */
function careerUrl(job: Job): string {
  if (job.job_url_direct && job.job_url_direct.length > 10) return job.job_url_direct
  return job.job_url
}

/** Suggested resume label from ats_feedback */
function suggestedResume(job: Job): { label: string; pdfPath: string } | null {
  const fb = job.ats_feedback as any
  if (!fb?.suggested_resume) return null
  return { label: fb.suggested_resume, pdfPath: fb.pdf_path || '' }
}

export default function JobsTable() {
  const qc = useQueryClient()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [query, setQuery] = useState<JobQuery>({
    sort_by: 'created_at',
    sort_dir: 'desc',
    page: 1,
    page_size: 20,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  // Debounce the search box into the query (350ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery((q) => ({ ...q, search: searchInput.trim() || undefined, page: 1 }))
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', query],
    queryFn: () => api.listJobs(query),
    refetchInterval: 8000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateJobStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  function toggleSort(col: NonNullable<JobQuery['sort_by']>) {
    setQuery((q) => ({
      ...q,
      sort_by: col,
      sort_dir: q.sort_by === col && q.sort_dir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }))
  }

  function SortIcon({ col }: { col: NonNullable<JobQuery['sort_by']> }) {
    if (query.sort_by !== col) return <ChevronUp size={11} className="text-slate-300" />
    return query.sort_dir === 'asc'
      ? <ChevronUp size={11} className="text-indigo-500" />
      : <ChevronDown size={11} className="text-indigo-500" />
  }

  const jobs = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.total_pages || 1

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Overall Jobs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} jobs · sorted by {query.sort_by?.replace(/_/g, ' ')}
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Filter size={14} />
          {showFilters ? 'Hide filters' : 'Filter'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by company, role, location, or tech…"
          className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-9 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Status</label>
            <select
              value={query.application_status || ''}
              onChange={(e) => setQuery((q) => ({ ...q, application_status: (e.target.value as ApplicationStatus) || undefined, page: 1 }))}
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
            >
              <option value="">All</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Location</label>
            <input
              type="text"
              value={query.location || ''}
              onChange={(e) => setQuery((q) => ({ ...q, location: e.target.value || undefined, page: 1 }))}
              placeholder="e.g. Bangalore"
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Min tech matches</label>
            <input
              type="number"
              min={0}
              value={query.min_tech_match ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, min_tech_match: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
              placeholder="e.g. 3"
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Min ATS score</label>
            <input
              type="number"
              min={0}
              max={100}
              value={query.min_ats_score ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, min_ats_score: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
              placeholder="e.g. 60"
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Mobile card list (below md) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading && <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>}
          {isError && <div className="text-center py-12 text-red-500 text-sm">Failed to load jobs.</div>}
          {!isLoading && !isError && jobs.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-base font-medium">No jobs yet</p>
              <p className="text-xs mt-1">Run the pipeline to start discovering jobs.</p>
            </div>
          )}
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-indigo-50/20 active:bg-indigo-50/40 transition-colors"
            >
              <SiteIcon site={job.site} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 text-sm truncate">{job.company || '—'}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{job.title}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={job.application_status} />
                  {job.is_remote && (
                    <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Remote</span>
                  )}
                  {job.ats_score !== null && (
                    <span className="text-xs font-bold text-indigo-600">{job.ats_score}%</span>
                  )}
                  {job.date_posted && (
                    <span className="text-xs text-slate-400">{relativeIST(job.date_posted)}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 mt-1 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* ── Desktop table (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {/* Company + Role */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 min-w-[200px]">
                  Company / Role
                </th>
                {/* Date posted */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                  <button className="flex items-center gap-1 hover:text-slate-700"
                    onClick={() => toggleSort('date_posted')}>
                    Posted (IST) <SortIcon col="date_posted" />
                  </button>
                </th>
                {/* Suggested resume */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 min-w-[160px]">
                  Suggested Resume
                </th>
                {/* Processing */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  Processing
                </th>
                {/* Application status */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  Status
                </th>
                {/* Actions */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
              )}
              {isError && (
                <tr><td colSpan={6} className="text-center py-12 text-red-500 text-sm">Failed to load jobs.</td></tr>
              )}
              {!isLoading && !isError && jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <p className="text-base font-medium">No jobs yet</p>
                    <p className="text-xs mt-1">Run the pipeline to start discovering jobs.</p>
                  </td>
                </tr>
              )}

              {jobs.map((job) => {
                const resume = suggestedResume(job)
                const url = careerUrl(job)

                return (
                  <tr
                    key={job.id}
                    className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    {/* Company + Role */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <SiteIcon site={job.site} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">
                            {job.company || '—'}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">
                            {job.title}
                          </p>
                          {job.is_remote && (
                            <span className="inline-block text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded mt-0.5">
                              Remote
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Posted datetime in IST */}
                    <td className="px-4 py-3">
                      {job.date_posted ? (
                        <div>
                          <p className="text-xs text-slate-700 whitespace-nowrap">
                            {toIST(job.date_posted)}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {relativeIST(job.date_posted)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Suggested resume with PDF download link */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {resume ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-700 leading-tight">
                            {resume.label}
                          </span>
                          <a
                            href={api.resumeDownloadUrl(job.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF resume"
                            className="flex-shrink-0 p-1 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                          >
                            <FileText size={13} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {job.processing_status === 'scraped' ? 'Pending…' : '—'}
                        </span>
                      )}
                    </td>

                    {/* Processing status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={job.processing_status} />
                    </td>

                    {/* Application status dropdown */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={job.application_status}
                        onChange={(e) => statusMutation.mutate({ id: job.id, status: e.target.value })}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {/* View JD */}
                        <button
                          onClick={() => setSelectedJob(job)}
                          title="View job details & JD"
                          className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        {/* Open career page */}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={job.job_url_direct ? 'Apply directly (company page)' : 'Open job listing'}
                          className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <button
              disabled={(query.page || 1) <= 1}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) - 1 }))}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setQuery((q) => ({ ...q, page }))}
                    className={`w-7 h-7 rounded text-xs font-medium ${
                      page === (query.page || 1)
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {String(page).padStart(2, '0')}
                  </button>
                )
              })}
              {totalPages > 7 && <span className="px-1">…</span>}
            </div>
            <button
              disabled={(query.page || 1) >= totalPages}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) + 1 }))}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Job Detail Drawer */}
      {selectedJob && (
        <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  )
}
