import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { fetchGraph, searchGraph, filterGraph, exportGraphJSON } from '../api/client'
import type { GraphElements, GraphNode, GraphEdge, DependencyScope } from '../types/graph'

// --- Theme definitions ---

interface Theme {
  name: string
  bg: string
  headerBg: string
  headerBorder: string
  panelBg: string
  panelBorder: string
  panelHeaderBorder: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  inputBg: string
  inputBorder: string
  inputFocusBorder: string
  btnBg: string
  btnText: string
  btnHoverText: string
  btnActiveBg: string
  btnActiveText: string
  linkColor: string
  linkHover: string
  legendBg: string
  badgeBg: string
  nodeLabel: string
  nodeOutline: string
  edgeDefault: string
  module: string
  class: string
  function: string
  external: string
  externalBorder: string
  imports: string
  inherits: string
  calls: string
  highlight: string
}

const THEMES: Record<string, Theme> = {
  dark: {
    name: 'Dark',
    bg: '#0f172a', headerBg: '#1e293b', headerBorder: '#334155', panelBg: '#1e293b',
    panelBorder: '#334155', panelHeaderBorder: '#334155',
    textPrimary: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b',
    inputBg: '#0f172a', inputBorder: '#475569', inputFocusBorder: '#3b82f6',
    btnBg: '#334155', btnText: '#94a3b8', btnHoverText: '#f1f5f9',
    btnActiveBg: '#2563eb', btnActiveText: '#ffffff',
    linkColor: '#60a5fa', linkHover: '#93bbfd',
    legendBg: 'rgba(30,41,59,0.85)', badgeBg: '#334155',
    nodeLabel: '#e2e8f0', nodeOutline: '#0f172a', edgeDefault: '#475569',
    module: '#3b82f6', class: '#22c55e', function: '#f97316', external: '#64748b',
    externalBorder: '#94a3b8', imports: '#60a5fa', inherits: '#a78bfa', calls: '#f472b6',
    highlight: '#fbbf24',
  },
  light: {
    name: 'Light',
    bg: '#f8fafc', headerBg: '#ffffff', headerBorder: '#e2e8f0', panelBg: '#ffffff',
    panelBorder: '#e2e8f0', panelHeaderBorder: '#e2e8f0',
    textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8',
    inputBg: '#f1f5f9', inputBorder: '#cbd5e1', inputFocusBorder: '#3b82f6',
    btnBg: '#e2e8f0', btnText: '#475569', btnHoverText: '#1e293b',
    btnActiveBg: '#2563eb', btnActiveText: '#ffffff',
    linkColor: '#2563eb', linkHover: '#1d4ed8',
    legendBg: 'rgba(255,255,255,0.9)', badgeBg: '#e2e8f0',
    nodeLabel: '#1e293b', nodeOutline: '#f8fafc', edgeDefault: '#94a3b8',
    module: '#2563eb', class: '#16a34a', function: '#ea580c', external: '#64748b',
    externalBorder: '#94a3b8', imports: '#3b82f6', inherits: '#7c3aed', calls: '#db2777',
    highlight: '#eab308',
  },
  neon: {
    name: 'Neon',
    bg: '#0a0a0a', headerBg: '#111111', headerBorder: '#1a1a2e', panelBg: '#111111',
    panelBorder: '#1a1a2e', panelHeaderBorder: '#1a1a2e',
    textPrimary: '#e0e0ff', textSecondary: '#8888cc', textMuted: '#555577',
    inputBg: '#0a0a0a', inputBorder: '#333366', inputFocusBorder: '#00ffff',
    btnBg: '#1a1a2e', btnText: '#8888cc', btnHoverText: '#e0e0ff',
    btnActiveBg: '#00cccc', btnActiveText: '#000000',
    linkColor: '#00ffff', linkHover: '#66ffff',
    legendBg: 'rgba(17,17,17,0.9)', badgeBg: '#1a1a2e',
    nodeLabel: '#e0e0ff', nodeOutline: '#0a0a0a', edgeDefault: '#333366',
    module: '#00aaff', class: '#00ff88', function: '#ff6600', external: '#666699',
    externalBorder: '#8888cc', imports: '#00ccff', inherits: '#cc66ff', calls: '#ff3399',
    highlight: '#ffff00',
  },
  sunset: {
    name: 'Sunset',
    bg: '#1a0a1e', headerBg: '#2d1233', headerBorder: '#4a1d5c', panelBg: '#2d1233',
    panelBorder: '#4a1d5c', panelHeaderBorder: '#4a1d5c',
    textPrimary: '#f5e6fa', textSecondary: '#c49dd4', textMuted: '#7a5a8a',
    inputBg: '#1a0a1e', inputBorder: '#5c2d6e', inputFocusBorder: '#ff6b9d',
    btnBg: '#3d1a4a', btnText: '#c49dd4', btnHoverText: '#f5e6fa',
    btnActiveBg: '#ff6b9d', btnActiveText: '#1a0a1e',
    linkColor: '#ff9ecd', linkHover: '#ffcce5',
    legendBg: 'rgba(45,18,51,0.9)', badgeBg: '#3d1a4a',
    nodeLabel: '#f5e6fa', nodeOutline: '#1a0a1e', edgeDefault: '#5c2d6e',
    module: '#ff6b9d', class: '#ffc857', function: '#ff8c42', external: '#7a5a8a',
    externalBorder: '#c49dd4', imports: '#c77dff', inherits: '#ff6b6b', calls: '#ffc857',
    highlight: '#00ffaa',
  },
}

const THEME_KEYS = Object.keys(THEMES)

function buildCytoStyle(t: Theme): cytoscape.Stylesheet[] {
  return [
    {
      selector: 'node',
      style: {
        label: 'data(label)', 'text-valign': 'center', 'font-size': '11px',
        color: t.nodeLabel, 'text-outline-color': t.nodeOutline, 'text-outline-width': 2,
        width: 30, height: 30,
      },
    },
    { selector: 'node.module', style: { 'background-color': t.module, shape: 'round-rectangle', width: 40, height: 40 } },
    { selector: 'node.class', style: { 'background-color': t.class, shape: 'diamond', width: 35, height: 35 } },
    { selector: 'node.function', style: { 'background-color': t.function, shape: 'ellipse' } },
    {
      selector: 'node.external', style: {
        'background-color': t.external, shape: 'round-rectangle',
        'border-style': 'dashed', 'border-width': 2, 'border-color': t.externalBorder,
      },
    },
    { selector: 'node.dimmed', style: { opacity: 0.2 } },
    { selector: 'node.highlighted', style: { 'border-width': 3, 'border-color': t.highlight } },
    {
      selector: 'edge', style: {
        width: 1.5, 'line-color': t.edgeDefault, 'target-arrow-color': t.edgeDefault,
        'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.8,
      },
    },
    { selector: 'edge[relationship = "imports"]', style: { 'line-color': t.imports, 'target-arrow-color': t.imports, 'line-style': 'dashed' } },
    { selector: 'edge[relationship = "inherits"]', style: { 'line-color': t.inherits, 'target-arrow-color': t.inherits, width: 2 } },
    { selector: 'edge[relationship = "calls"]', style: { 'line-color': t.calls, 'target-arrow-color': t.calls, 'line-style': 'dotted' } },
    { selector: 'edge.dimmed', style: { opacity: 0.1 } },
  ]
}

const NODE_TYPES = ['all', 'module', 'class', 'function', 'external'] as const
const SCOPES: DependencyScope[] = ['all', 'internal', 'external']

export default function GraphView() {
  const { projectId } = useParams<{ projectId: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  const [selected, setSelected] = useState<GraphNode['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })
  const [graphElements, setGraphElements] = useState<GraphElements | null>(null)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [scope, setScope] = useState<DependencyScope>('all')
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Panel collapse
  const [panelOpen, setPanelOpen] = useState(true)

  // Theme
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('codeatlas-theme') || 'dark')
  const theme = THEMES[themeKey] || THEMES.dark

  const getConnections = useCallback((nodeId: string) => {
    if (!graphElements) return { incoming: [] as GraphEdge[], outgoing: [] as GraphEdge[] }
    return {
      incoming: graphElements.edges.filter((e) => e.data.target === nodeId),
      outgoing: graphElements.edges.filter((e) => e.data.source === nodeId),
    }
  }, [graphElements])

  const getNodeLabel = useCallback((nodeId: string) => {
    return graphElements?.nodes.find((n) => n.data.id === nodeId)?.data.label ?? nodeId
  }, [graphElements])

  // Resize Cytoscape when panel is toggled
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    // Resize immediately for the interim, and again after the CSS transition finishes
    cy.resize()
    const timer = setTimeout(() => { cy.resize() }, 250)
    return () => clearTimeout(timer)
  }, [panelOpen])

  // Update Cytoscape style when theme changes
  useEffect(() => {
    localStorage.setItem('codeatlas-theme', themeKey)
    const cy = cyRef.current
    if (cy) cy.style(buildCytoStyle(theme))
  }, [themeKey, theme])

  // Load graph
  useEffect(() => {
    if (!projectId || !containerRef.current) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetchGraph(projectId!)
        if (cancelled) return
        const elements = res.elements as GraphElements
        setGraphElements(elements)
        setStats({ nodes: elements.nodes.length, edges: elements.edges.length })
        renderGraph(elements)
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) setError(e.message)
        setLoading(false)
      }
    }

    function renderGraph(elements: GraphElements) {
      cyRef.current?.destroy()
      const cy = cytoscape({
        container: containerRef.current!,
        elements: [
          ...elements.nodes.map((n) => ({ group: 'nodes' as const, ...n })),
          ...elements.edges.map((e) => ({ group: 'edges' as const, ...e })),
        ],
        style: buildCytoStyle(theme),
        layout: {
          name: 'cose',
          animate: false,
          nodeDimensionsIncludeLabels: true,
          idealEdgeLength: () => 120,
          nodeRepulsion: () => 8000,
        },
      })
      cy.on('tap', 'node', (e) => setSelected(e.target.data()))
      cy.on('tap', (e) => { if (e.target === cy) setSelected(null) })
      cyRef.current = cy
    }

    load()
    return () => { cancelled = true; cyRef.current?.destroy() }
  }, [projectId, theme])

  // Search highlighting
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      const cy = cyRef.current
      if (!cy || !projectId) return

      if (!searchQuery && typeFilter === 'all') {
        cy.elements().removeClass('dimmed highlighted')
        return
      }

      searchGraph(projectId, searchQuery || undefined, typeFilter === 'all' ? undefined : typeFilter)
        .then((res) => {
          const matchIds = new Set(res.elements.nodes.map((n) => n.data.id))
          cy.nodes().forEach((n) => {
            if (matchIds.has(n.id())) {
              n.removeClass('dimmed').addClass('highlighted')
            } else {
              n.removeClass('highlighted').addClass('dimmed')
            }
          })
          cy.edges().forEach((e) => {
            if (matchIds.has(e.data('source')) || matchIds.has(e.data('target'))) {
              e.removeClass('dimmed')
            } else {
              e.addClass('dimmed')
            }
          })
        })
        .catch(() => {})
    }, 300)
    setSearchTimeout(timeout)
    return () => clearTimeout(timeout)
  }, [searchQuery, typeFilter, projectId])

  // Dependency scope filter
  const handleScopeChange = async (newScope: DependencyScope) => {
    setScope(newScope)
    if (!projectId || !containerRef.current) return

    try {
      const res = await filterGraph(projectId, newScope)
      const elements = res.elements as GraphElements
      setGraphElements(elements)
      setStats({ nodes: elements.nodes.length, edges: elements.edges.length })

      cyRef.current?.destroy()
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...elements.nodes.map((n) => ({ group: 'nodes' as const, ...n })),
          ...elements.edges.map((e) => ({ group: 'edges' as const, ...e })),
        ],
        style: buildCytoStyle(theme),
        layout: { name: 'cose', animate: false, nodeDimensionsIncludeLabels: true,
          idealEdgeLength: () => 120, nodeRepulsion: () => 8000 },
      })
      cy.on('tap', 'node', (e) => setSelected(e.target.data()))
      cy.on('tap', (e) => { if (e.target === cy) setSelected(null) })
      cyRef.current = cy
    } catch {}
  }

  // Export
  const handleExport = (format: 'png' | 'svg' | 'json') => {
    const cy = cyRef.current
    if (!cy || !projectId) return

    if (format === 'png') {
      const blob = cy.png({ output: 'blob', full: true, bg: theme.bg })
      downloadBlob(blob as unknown as Blob, `codeatlas-${projectId.slice(0, 8)}.png`)
    } else if (format === 'json') {
      window.open(exportGraphJSON(projectId), '_blank')
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Detail panel content
  const renderDetailPanel = () => {
    if (!selected) {
      return (
        <div className="flex items-center justify-center h-full text-sm"
             style={{ color: theme.textMuted }}>
          Click a node to see details
        </div>
      )
    }

    const { incoming, outgoing } = getConnections(selected.id)
    const typeColorMap: Record<string, string> = {
      module: theme.module, class: theme.class, function: theme.function, external: theme.external,
    }

    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: typeColorMap[selected.type] || theme.external }} />
          <h2 className="text-base font-mono font-semibold truncate" style={{ color: theme.textPrimary }}>
            {selected.label}
          </h2>
        </div>

        {/* Properties */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <span style={{ color: theme.textSecondary }}>Type</span>
          <span className="capitalize" style={{ color: theme.textPrimary }}>{selected.type}</span>
          {selected.file && (
            <>
              <span style={{ color: theme.textSecondary }}>File</span>
              <span className="font-mono text-xs" style={{ color: theme.textPrimary }}>{selected.file}</span>
            </>
          )}
          {selected.line > 0 && (
            <>
              <span style={{ color: theme.textSecondary }}>Line</span>
              <span className="font-mono" style={{ color: theme.textPrimary }}>{selected.line}</span>
            </>
          )}
          {selected.directory && (
            <>
              <span style={{ color: theme.textSecondary }}>Directory</span>
              <span className="font-mono text-xs" style={{ color: theme.textPrimary }}>{selected.directory}</span>
            </>
          )}
          <span style={{ color: theme.textSecondary }}>Connections</span>
          <span style={{ color: theme.textPrimary }}>{selected.connections}</span>
        </div>

        {/* Incoming */}
        {incoming.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-1.5 uppercase tracking-wide"
                style={{ color: theme.textSecondary }}>
              Incoming ({incoming.length})
            </h3>
            <ul className="space-y-1">
              {incoming.map((e) => (
                <li key={e.data.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{ backgroundColor: theme.badgeBg, color: theme.textMuted }}>
                    {e.data.relationship}
                  </span>
                  <button
                    onClick={() => {
                      const node = graphElements?.nodes.find((n) => n.data.id === e.data.source)
                      if (node) setSelected(node.data)
                    }}
                    className="font-mono text-xs truncate"
                    style={{ color: theme.linkColor }}
                  >
                    {getNodeLabel(e.data.source)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Outgoing */}
        {outgoing.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-1.5 uppercase tracking-wide"
                style={{ color: theme.textSecondary }}>
              Outgoing ({outgoing.length})
            </h3>
            <ul className="space-y-1">
              {outgoing.map((e) => (
                <li key={e.data.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{ backgroundColor: theme.badgeBg, color: theme.textMuted }}>
                    {e.data.relationship}
                  </span>
                  <button
                    onClick={() => {
                      const node = graphElements?.nodes.find((n) => n.data.id === e.data.target)
                      if (node) setSelected(node.data)
                    }}
                    className="font-mono text-xs truncate"
                    style={{ color: theme.linkColor }}
                  >
                    {getNodeLabel(e.data.target)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {incoming.length === 0 && outgoing.length === 0 && (
          <p className="text-sm" style={{ color: theme.textMuted }}>No connections</p>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 gap-4"
              style={{ backgroundColor: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}` }}>
        <Link to="/" className="font-medium shrink-0" style={{ color: theme.linkColor }}>
          CodeAtlas
        </Link>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded text-sm focus:outline-none"
            style={{
              backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`,
              color: theme.textPrimary,
            }}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 rounded text-sm focus:outline-none"
            style={{
              backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`,
              color: theme.textPrimary,
            }}
          >
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
            ))}
          </select>
        </div>

        {/* Scope filter */}
        <div className="flex items-center gap-1 shrink-0">
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => handleScopeChange(s)}
              className="px-2.5 py-1 text-xs rounded transition"
              style={{
                backgroundColor: scope === s ? theme.btnActiveBg : theme.btnBg,
                color: scope === s ? theme.btnActiveText : theme.btnText,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Theme picker */}
        <div className="flex items-center gap-1 shrink-0">
          {THEME_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setThemeKey(k)}
              className="px-2 py-1 text-xs rounded transition"
              style={{
                backgroundColor: themeKey === k ? theme.btnActiveBg : theme.btnBg,
                color: themeKey === k ? theme.btnActiveText : theme.btnText,
              }}
              title={THEMES[k].name}
            >
              {THEMES[k].name}
            </button>
          ))}
        </div>

        {/* Export + stats */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleExport('png')}
            className="px-2.5 py-1 text-xs rounded transition"
            style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
            title="Export as PNG"
          >
            PNG
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-2.5 py-1 text-xs rounded transition"
            style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
            title="Export as JSON"
          >
            JSON
          </button>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="px-2.5 py-1 text-xs rounded transition"
            style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
            title={panelOpen ? 'Hide panel' : 'Show panel'}
          >
            {panelOpen ? 'Hide' : 'Show'} Panel
          </button>
          <span className="text-xs" style={{ color: theme.textMuted }}>
            {stats.nodes}n / {stats.edges}e
          </span>
        </div>
      </header>

      {/* Split view: graph + detail panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Graph canvas — fills remaining space */}
        <div className="relative min-h-0" style={{ flex: '1 1 0%', minWidth: 0 }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10"
                 style={{ backgroundColor: theme.bg }}>
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                   style={{ borderColor: `${theme.module} transparent transparent transparent` }} />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10"
                 style={{ backgroundColor: theme.bg }}>
              <p className="text-red-400">{error}</p>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-3 text-xs px-3 py-2 rounded-lg"
               style={{ backgroundColor: theme.legendBg, color: theme.textSecondary }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.module }} /> Module
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.class }} /> Class
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.function }} /> Function
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.external }} /> External
            </span>
          </div>
        </div>

        {/* Detail panel (right side) — always in DOM, hidden via width */}
        <div
          className="flex flex-col min-h-0 overflow-hidden transition-[width] duration-200"
          style={{
            width: panelOpen ? 320 : 0,
            flexShrink: 0,
            backgroundColor: theme.panelBg,
            borderLeft: panelOpen ? `1px solid ${theme.panelBorder}` : 'none',
          }}
        >
          <div className="w-80 flex flex-col h-full">
            <div className="px-4 py-2.5 text-sm font-medium shrink-0"
                 style={{ borderBottom: `1px solid ${theme.panelHeaderBorder}`, color: theme.textSecondary }}>
              Details
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderDetailPanel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
