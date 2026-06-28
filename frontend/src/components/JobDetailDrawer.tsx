import { useState } from 'react'
import { X, ExternalLink, RefreshCw, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { Job, ApplicationStatus } from '../types'
import StatusBadge from './StatusBadge'
import { toIST, relativeIST } from '../utils/time'
import { APPLICATION_STATUSES } from '../utils/status'

interface Props {
  job: Job
  onClose: () => void
}

function careerUrl(job: Job): string {
  if (job.job_url_direct && job.job_url_direct.length > 10) return job.job_url_direct
  return job.job_url
}

/** Convert markdown-ish job description text to clean HTML for display */
function renderJD(text: string): string {
  if (!text) return ''

  let html = text
    // Escape HTML special chars first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Italic: *text* or _text_ (not bullets)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Headings: ### ## #
  html = html.replace(/^### (.+)$/gm, '<h3 class="jd-h3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="jd-h2">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="jd-h1">$1</h1>')

  // Bullet lists: lines starting with - or *
  // First mark each list item
  html = html.replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>')
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (match) => `<ul class="jd-ul">${match}</ul>`)

  // Numbered lists: 1. 2. etc
  html = html.replace(/^[ \t]*\d+\. (.+)$/gm, '<li>$1</li>')

  // Horizontal rules
  html = html.replace(/^[-*]{3,}$/gm, '<hr class="jd-hr"/>')

  // Blank lines → paragraph breaks (only between non-tag content)
  // Split into lines and group non-tag lines as paragraphs
  const lines = html.split('\n')
  const output: string[] = []
  let inParagraph = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inParagraph) {
        output.push('</p>')
        inParagraph = false
      }
      continue
    }
    // Don't wrap lines that are already block elements
    if (/^<(h[1-6]|ul|li|ol|hr|p|div|strong|em)/.test(trimmed)) {
      if (inParagraph) { output.push('</p>'); inParagraph = false }
      output.push(trimmed)
    } else {
      if (!inParagraph) { output.push('<p class="jd-p">'); inParagraph = true }
      output.push(trimmed + ' ')
    }
  }
  if (inParagraph) output.push('</p>')

  return output.join('\n')
}

export default function JobDetailDrawer({ job, onClose }: Props) {
  const qc = useQueryClient()
  const [showFullJD, setShowFullJD] = useState(false)

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) => api.updateJobStatus(job.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const reprocessMutation = useMutation({
    mutationFn: () => api.reprocessJob(job.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const fb = job.ats_feedback as any
  const techs = job.matched_technologies
    ? job.matched_technologies.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const url = careerUrl(job)
  const isDirect = url === job.job_url_direct

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 text-base leading-tight">{job.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {job.company}
              {job.location ? ` · ${job.location}` : ''}
              {job.site ? ` · ${job.site}` : ''}
              {job.is_remote ? ' · 🌐 Remote' : ''}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Status chips row */}
          <div className="px-6 pt-4 pb-3 flex flex-wrap items-center gap-2 border-b border-slate-50">
            <StatusBadge status={job.processing_status} size="md" />
            <StatusBadge status={job.application_status} size="md" />
            {job.date_posted && (
              <span className="ml-auto text-xs text-slate-400">
                {toIST(job.date_posted)} · {relativeIST(job.date_posted)}
              </span>
            )}
          </div>

          <div className="px-6 py-4 space-y-5">

            {/* ── Suggested Resume ─────────────────────────── */}
            {fb?.suggested_resume && (
              <section className="bg-indigo-50 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs font-semibold text-indigo-800 mb-0.5">Suggested Resume</p>
                    <p className="text-sm font-bold text-indigo-900">{fb.suggested_resume}</p>
                  </div>
                  <a
                    href={api.resumeDownloadUrl(job.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
                  >
                    <FileText size={12} />
                    Download PDF
                  </a>
                </div>
                {fb.matched_keywords?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-indigo-600 font-medium mb-1.5">
                      Matched {fb.match_score} keyword{fb.match_score !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(fb.matched_keywords as string[]).map((kw) => (
                        <span key={kw} className="text-xs bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── ATS score (only if computed) ──────────────── */}
            {job.ats_score !== null && fb?.ats_matched && (
              <section className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    ATS Keyword Score
                  </h3>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                    job.ats_score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    job.ats_score >= 50 ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {job.ats_score}%
                  </span>
                </div>
                {fb.ats_matched?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 mb-1">✓ Matched</p>
                    <div className="flex flex-wrap gap-1">
                      {fb.ats_matched.map((kw: string) => (
                        <span key={kw} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {fb.ats_missing?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-1">✗ Missing</p>
                    <div className="flex flex-wrap gap-1">
                      {fb.ats_missing.map((kw: string) => (
                        <span key={kw} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Tech tags ─────────────────────────────────── */}
            {techs.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Matched Tech ({job.tech_match_count})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {techs.map((t) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </section>
            )}

            {/* ── Full Job Description ───────────────────────── */}
            {job.description ? (
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Job Description
                </h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  {/* Rendered markdown JD */}
                  <div
                    className={`jd-content text-xs text-slate-700 leading-relaxed overflow-hidden transition-all duration-300 ${
                      showFullJD ? '' : 'max-h-72'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderJD(job.description) }}
                  />
                  {/* Show more / less toggle */}
                  <button
                    onClick={() => setShowFullJD((v) => !v)}
                    className="flex items-center gap-1 mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {showFullJD
                      ? <><ChevronUp size={12} /> Show less</>
                      : <><ChevronDown size={12} /> Show full JD</>}
                  </button>
                </div>
              </section>
            ) : (
              <p className="text-xs text-slate-400 italic">No job description available.</p>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-3">

          {/* Application status selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Status</label>
            <select
              value={job.application_status}
              onChange={(e) => statusMutation.mutate(e.target.value as ApplicationStatus)}
              disabled={statusMutation.isPending}
              className="flex-1 text-xs py-2 px-2 rounded-lg font-medium border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {APPLICATION_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Action row */}
          <div className="flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              <ExternalLink size={12} />
              {isDirect ? 'Apply Directly 🎯' : 'Open Job Listing'}
            </a>
            <button
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
              title="Re-match resume"
              className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg font-medium transition-colors border border-slate-200"
            >
              <RefreshCw size={12} className={reprocessMutation.isPending ? 'animate-spin' : ''} />
              Re-match
            </button>
          </div>

          {!isDirect && (
            <p className="text-xs text-center text-slate-400">
              Direct company link not available — opening job listing
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
