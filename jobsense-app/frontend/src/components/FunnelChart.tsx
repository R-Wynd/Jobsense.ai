import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, ExternalLink, GitFork } from 'lucide-react'
import { api } from '../api'
import type { FunnelData } from '../types'

// Node colors — tuned to resemble the SankeyMATIC reference palette.
const NODE_COLORS: Record<string, string> = {
  Applied: '#f59e0b',
  Awaiting: '#94a3b8',
  'Round 1': '#ec4899',
  'Round 2': '#ec4899',
  'Round 3': '#ec4899',
  'No Advance': '#a78bfa',
  Pending: '#a8a29e',
  Offer: '#f9a8d4',
  'Offer Accepted': '#16a34a',
  'Offer Declined': '#f97316',
  Rejected: '#4eb3ab',
  Ghosted: '#5cb85c',
  Withdrew: '#fbbf24',
}
const nodeColor = (name: string) => NODE_COLORS[name] || '#94a3b8'

// Canonical top→bottom ordering within each layer (keeps layout stable/readable).
const ORDER = [
  'Applied', 'Awaiting', 'Round 1', 'Round 2', 'Round 3',
  'No Advance', 'Pending', 'Offer', 'Offer Accepted', 'Offer Declined',
  'Rejected', 'Ghosted', 'Withdrew',
]
const orderKey = (name: string) => {
  const i = ORDER.indexOf(name)
  return i === -1 ? 999 : i
}

interface PNode { name: string; x: number; y: number; h: number; layer: number; value: number }
interface PLink { source: string; target: string; value: number; sy: number; ty: number; x0: number; x1: number; w: number }

const NODE_W = 60
const NODE_PAD = 26
const COL_SPACING = 275
const MARGIN = { top: 20, bottom: 20, left: 8, right: 150 }
const HEIGHT = 720          // max canvas height (used to fit large datasets)
const NODE_MAX_PX = 500     // cap on the tallest bar so small counts don't balloon

function buildLayout(data: FunnelData) {
  const names = data.nodes.map((n) => n.name)
  if (names.length === 0) return null

  const outLinks: Record<string, FunnelData['links']> = {}
  const inLinks: Record<string, FunnelData['links']> = {}
  names.forEach((n) => { outLinks[n] = []; inLinks[n] = [] })
  data.links.forEach((l) => { outLinks[l.source]?.push(l); inLinks[l.target]?.push(l) })

  // Layer = longest path from a source, via Kahn topological processing.
  const layer: Record<string, number> = {}
  const indeg: Record<string, number> = {}
  names.forEach((n) => { layer[n] = 0; indeg[n] = inLinks[n].length })
  const q = names.filter((n) => indeg[n] === 0)
  while (q.length) {
    const n = q.shift()!
    for (const l of outLinks[n]) {
      layer[l.target] = Math.max(layer[l.target], layer[n] + 1)
      if (--indeg[l.target] === 0) q.push(l.target)
    }
  }
  const maxLayer = Math.max(...Object.values(layer))

  // Node value = max(inflow, outflow).
  const value: Record<string, number> = {}
  names.forEach((n) => {
    const inSum = inLinks[n].reduce((s, l) => s + l.value, 0)
    const outSum = outLinks[n].reduce((s, l) => s + l.value, 0)
    value[n] = Math.max(inSum, outSum, 1)
  })

  // Group + order nodes per layer.
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => [])
  names.forEach((n) => layers[layer[n]].push(n))
  layers.forEach((arr) => arr.sort((a, b) => orderKey(a) - orderKey(b)))

  // Scale so the tallest column fits the available height.
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
  let maxTotal = 0, maxCount = 1
  layers.forEach((arr) => {
    const tot = arr.reduce((s, n) => s + value[n], 0)
    if (tot > maxTotal) { maxTotal = tot; maxCount = arr.length }
  })
  // Fit the tallest column to the canvas, but cap per-node thickness so a
  // handful of jobs doesn't render as a giant block.
  const maxNodeValue = Math.max(...Object.values(value))
  const fitScale = (innerH - (maxCount - 1) * NODE_PAD) / maxTotal
  const scale = Math.max(0.0001, Math.min(fitScale, NODE_MAX_PX / maxNodeValue))

  // Top-align columns and crop the canvas to actual content height.
  const pos: Record<string, PNode> = {}
  let contentBottom = 0
  layers.forEach((arr, li) => {
    let y = MARGIN.top
    for (const n of arr) {
      const h = Math.max(2, value[n] * scale)
      pos[n] = { name: n, x: MARGIN.left + li * COL_SPACING, y, h, layer: li, value: value[n] }
      y += h + NODE_PAD
      contentBottom = Math.max(contentBottom, y - NODE_PAD)
    }
  })
  const svgHeight = Math.round(contentBottom + MARGIN.bottom)

  // Assign ribbon attachment offsets (sorted to reduce crossings).
  const outOff: Record<string, number> = {}, inOff: Record<string, number> = {}
  names.forEach((n) => { outOff[n] = 0; inOff[n] = 0 })
  const plinks: PLink[] = []
  names.forEach((n) => {
    outLinks[n].sort((a, b) => pos[a.target].y - pos[b.target].y)
    for (const l of outLinks[n]) {
      const w = Math.max(1, l.value * scale)
      const sy = pos[n].y + outOff[n] + w / 2
      outOff[n] += w
      plinks.push({ ...l, sy, ty: 0, x0: pos[n].x + NODE_W, x1: 0, w })
    }
  })
  names.forEach((n) => {
    inLinks[n].sort((a, b) => pos[a.source].y - pos[b.source].y)
    for (const l of inLinks[n]) {
      const w = Math.max(1, l.value * scale)
      const ty = pos[n].y + inOff[n] + w / 2
      inOff[n] += w
      const pl = plinks.find((p) => p.source === l.source && p.target === l.target)!
      pl.ty = ty
      pl.x1 = pos[n].x
    }
  })

  const width = MARGIN.left + maxLayer * COL_SPACING + NODE_W + MARGIN.right
  return { pos, plinks, width, svgHeight, nodes: Object.values(pos) }
}

function ribbonPath(l: PLink): string {
  const xm = (l.x0 + l.x1) / 2
  return `M${l.x0},${l.sy} C${xm},${l.sy} ${xm},${l.ty} ${l.x1},${l.ty}`
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function FunnelChart() {
  const [copied, setCopied] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['funnel'],
    queryFn: () => api.getFunnel(),
    refetchInterval: 15000,
  })

  const layout = useMemo(() => (data ? buildLayout(data) : null), [data])

  const copySource = async () => {
    if (!data) return
    await navigator.clipboard.writeText(data.sankeymatic)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (isLoading) return <div className="text-sm text-slate-500">Loading funnel…</div>
  if (error) return <div className="text-sm text-red-600">Failed to load funnel.</div>
  if (!data) return null

  const t = data.totals
  const hasFlow = data.links.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <GitFork size={22} className="text-indigo-600 rotate-90" /> Application Funnel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Sankey view of where your applications stand — rendered in-app and exportable to SankeyMATIC.
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatPill label="Applied" value={t.applied_total || 0} color="#f59e0b" />
        <StatPill label="Interviews" value={t.interviews || 0} color="#ec4899" />
        <StatPill label="Offers" value={t.offers || 0} color="#16a34a" />
        <StatPill label="Rejected" value={t.rejected || 0} color="#4eb3ab" />
        <StatPill label="Ghosted" value={t.ghosted || 0} color="#5cb85c" />
        <StatPill label="Not Applied" value={t.not_applied || 0} color="#94a3b8" />
      </div>

      {/* Sankey */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
        {hasFlow && layout ? (
          <svg width={layout.width} height={layout.svgHeight} viewBox={`0 0 ${layout.width} ${layout.svgHeight}`}>
            {/* links */}
            <g>
              {layout.plinks.map((l, i) => (
                <path
                  key={i}
                  d={ribbonPath(l)}
                  fill="none"
                  stroke={nodeColor(l.source)}
                  strokeWidth={l.w}
                  strokeOpacity={0.4}
                  strokeLinecap="butt"
                />
              ))}
            </g>
            {/* nodes */}
            <g>
              {layout.nodes.map((n) => (
                <g key={n.name}>
                  <rect x={n.x} y={n.y} width={NODE_W} height={n.h} rx={1.5} fill={nodeColor(n.name)} />
                  <text x={n.x + NODE_W + 7} y={n.y + n.h / 2 - 2} fontSize={12} fontWeight={600} fill="#323b4c" dominantBaseline="middle">
                    {n.name}
                  </text>
                  <text x={n.x + NODE_W + 7} y={n.y + n.h / 2 + 12} fontSize={11} fill="#64748b" dominantBaseline="middle">
                    {n.value}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <GitFork size={32} className="mx-auto mb-3 text-slate-300 rotate-90" />
            <p className="text-sm font-medium text-slate-600">No application flow yet</p>
            <p className="text-xs mt-1">
              Set an <span className="font-medium">Application Status</span> (Applied, Round 1, Offer…) on your jobs
              in the Job Tracker — the funnel fills in automatically.
            </p>
          </div>
        )}
      </div>

      {/* SankeyMATIC export */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-slate-800">SankeyMATIC source</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SankeyMATIC has no public API, so copy this and paste it into the builder to get the identical diagram.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copySource}
              disabled={!hasFlow}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg font-medium transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy source'}
            </button>
            <a
              href="https://sankeymatic.com/build/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <ExternalLink size={13} /> Open SankeyMATIC
            </a>
          </div>
        </div>
        <textarea
          readOnly
          value={data.sankeymatic || '# No flows yet — set application statuses on your jobs.'}
          rows={Math.min(14, Math.max(4, data.links.length + 1))}
          className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 resize-y"
        />
      </div>
    </div>
  )
}
