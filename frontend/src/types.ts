export type ApplicationStatus =
  | 'not_applied'
  | 'applied'
  | 'round_1'
  | 'round_2'
  | 'round_3'
  | 'no_advance'
  | 'pending'
  | 'offer'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'ghosted'
  | 'withdrew'

export interface FunnelData {
  nodes: { name: string }[]
  links: { source: string; target: string; value: number }[]
  sankeymatic: string
  counts: Record<string, number>
  totals: Record<string, number>
}

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'
export type ProcessingStatus = 'scraped' | 'tailoring' | 'scored' | 'processed' | 'failed'

export interface AtsFeedback {
  matched: string[]
  missing: string[]
  feedback: string
  keyword_score?: number
  semantic_score?: number | null
  // New: resume suggestion fields
  suggested_resume?: string
  resume_key?: string
  match_score?: number
  matched_keywords?: string[]
  md_path?: string
  pdf_path?: string
  template_used?: string
  // Optional ATS fields
  ats_matched?: string[]
  ats_missing?: string[]
  ats_feedback?: string
}

export interface Job {
  id: string
  job_url: string
  job_url_direct: string | null   // direct company career page
  title: string
  company: string | null
  location: string | null
  site: string | null
  description: string | null      // full JD text
  date_posted: string | null
  is_remote: boolean | null
  tech_match_count: number
  matched_technologies: string | null
  ats_score: number | null
  ats_feedback: AtsFeedback | null
  resume_available: boolean
  processing_status: ProcessingStatus
  application_status: ApplicationStatus
  applied_at: string | null
  last_run_id: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PipelineRun {
  id: string
  status: RunStatus
  started_at: string | null
  finished_at: string | null
  jobs_scraped: number
  jobs_processed: number
  jobs_failed: number
  error: string | null
  created_at: string | null
}

export interface PaginatedJobs {
  items: Job[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface HealthStatus {
  ok: boolean
  llm_configured: boolean
  version: string
}

export interface JobQuery {
  application_status?: ApplicationStatus
  min_ats_score?: number
  location?: string
  min_tech_match?: number
  search?: string
  sort_by?: 'ats_score' | 'date_posted' | 'tech_match_count' | 'created_at'
  sort_dir?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface ScheduleData {
  enabled: boolean
  interval_hours: number
  last_run_at: string | null
  next_run_at: string | null
}
