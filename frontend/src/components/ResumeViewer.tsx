import { useState, useRef, useEffect } from 'react'
import { X, Save, Download, Edit3, Eye, CheckCircle2, Loader2 } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api'

interface Props {
  jobId: string
  jobTitle: string
  company: string | null
  onClose: () => void
}

// Minimal markdown → styled HTML renderer for preview
function renderMarkdown(md: string): string {
  return md
    // h1
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // h2
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // h3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // paragraphs — blank lines between non-tagged content
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // clean up empty lines
    .replace(/\n{3,}/g, '\n\n')
}

export default function ResumeViewer({ jobId, jobTitle, company, onClose }: Props) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [editContent, setEditContent] = useState('')
  const [saved, setSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['resume-content', jobId],
    queryFn: () => api.getResumeContent(jobId),
  })

  useEffect(() => {
    if (data?.content) {
      setEditContent(data.content)
    }
  }, [data?.content])

  const saveMutation = useMutation({
    mutationFn: () => api.saveResumeContent(jobId, editContent),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const content = mode === 'edit' ? editContent : (data?.content || '')

  // K8s badge colors
  const BADGES = [
    { label: '⎈ Kubernetes', color: '#326CE5' },
    { label: '☁ AWS', color: '#FF9900' },
    { label: '⚡ Terraform', color: '#7B42BC' },
    { label: '🔥 SRE', color: '#e11d48' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Resume — {jobTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{company}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode('preview')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  mode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye size={12} /> Preview
              </button>
              <button
                onClick={() => { setMode('edit'); setTimeout(() => textareaRef.current?.focus(), 50) }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  mode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>

            {/* Save (edit mode) */}
            {mode === 'edit' && (
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
              >
                {saveMutation.isPending
                  ? <Loader2 size={12} className="animate-spin" />
                  : saved
                    ? <CheckCircle2 size={12} />
                    : <Save size={12} />}
                {saved ? 'Saved!' : 'Save'}
              </button>
            )}

            {/* Download PDF */}
            <a
              href={api.resumePdfUrl(jobId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <Download size={12} />
              PDF
            </a>

            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> Loading resume…
            </div>
          )}
          {isError && (
            <div className="flex items-center justify-center h-full text-red-500">
              Failed to load resume content.
            </div>
          )}

          {data && mode === 'preview' && (
            <div className="h-full overflow-y-auto">
              {/* A4-style preview */}
              <div className="max-w-[794px] mx-auto my-6 bg-white border border-slate-200 rounded-lg shadow-sm px-12 py-10 min-h-[1000px]"
                   style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10pt', lineHeight: '1.5', color: '#1a1a1a' }}>

                {/* K8s + tech badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {BADGES.map((b) => (
                    <span
                      key={b.label}
                      style={{ background: b.color }}
                      className="text-white text-xs px-3 py-0.5 rounded-full font-medium"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>

                <div
                  className="resume-preview"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              </div>
            </div>
          )}

          {data && mode === 'edit' && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                ✏️ Edit in plain text. Changes are saved per-job. Click Save to persist.
              </div>
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 p-6 text-sm font-mono leading-relaxed text-slate-800 resize-none outline-none border-0"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' }}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Inline CSS for preview styles */}
      <style>{`
        .resume-preview h1 { font-size: 20pt; font-weight: bold; margin: 0 0 4px 0; }
        .resume-preview h2 { font-size: 11pt; font-weight: bold; color: #4f46e5; border-bottom: 1.5px solid #4f46e5; padding-bottom: 2px; margin: 16px 0 6px 0; }
        .resume-preview h3 { font-size: 10.5pt; font-weight: bold; margin: 10px 0 3px 0; }
        .resume-preview p { margin: 3px 0; font-size: 10pt; }
        .resume-preview ul { margin: 3px 0 8px 0; padding-left: 18px; }
        .resume-preview li { margin-bottom: 2px; font-size: 10pt; }
        .resume-preview hr { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }
        .resume-preview strong { font-weight: 600; }
      `}</style>
    </div>
  )
}
