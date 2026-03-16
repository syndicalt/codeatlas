import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { fetchGraph } from '../api/client'
import type { GraphElements, GraphNode, GraphEdge } from '../types/graph'

const CYTO_STYLE: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'font-size': '11px',
      color: '#e2e8f0',
      'text-outline-color': '#0f172a',
      'text-outline-width': 2,
      width: 30,
      height: 30,
    },
  },
  {
    selector: 'node.module',
    style: {
      'background-color': '#3b82f6',
      shape: 'round-rectangle',
      width: 40,
      height: 40,
    },
  },
  {
    selector: 'node.class',
    style: {
      'background-color': '#22c55e',
      shape: 'diamond',
      width: 35,
      height: 35,
    },
  },
  {
    selector: 'node.function',
    style: {
      'background-color': '#f97316',
      shape: 'ellipse',
    },
  },
  {
    selector: 'node.external',
    style: {
      'background-color': '#64748b',
      shape: 'round-rectangle',
      'border-style': 'dashed',
      'border-width': 2,
      'border-color': '#94a3b8',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#475569',
      'target-arrow-color': '#475569',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
    },
  },
  {
    selector: 'edge[relationship = "imports"]',
    style: {
      'line-color': '#60a5fa',
      'target-arrow-color': '#60a5fa',
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge[relationship = "inherits"]',
    style: {
      'line-color': '#a78bfa',
      'target-arrow-color': '#a78bfa',
      width: 2,
    },
  },
]

export default function GraphView() {
  const { projectId } = useParams<{ projectId: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selected, setSelected] = useState<GraphNode['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })
  const [graphElements, setGraphElements] = useState<GraphElements | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Focus modal when it opens
  useEffect(() => {
    if (selected && modalRef.current) {
      modalRef.current.focus()
    }
  }, [selected])

  const getConnections = useCallback((nodeId: string) => {
    if (!graphElements) return { incoming: [] as GraphEdge[], outgoing: [] as GraphEdge[] }
    const incoming = graphElements.edges.filter((e) => e.data.target === nodeId)
    const outgoing = graphElements.edges.filter((e) => e.data.source === nodeId)
    return { incoming, outgoing }
  }, [graphElements])

  const getNodeLabel = useCallback((nodeId: string) => {
    if (!graphElements) return nodeId
    const node = graphElements.nodes.find((n) => n.data.id === nodeId)
    return node?.data.label ?? nodeId
  }, [graphElements])

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

        const cy = cytoscape({
          container: containerRef.current!,
          elements: [
            ...elements.nodes.map((n) => ({ group: 'nodes' as const, ...n })),
            ...elements.edges.map((e) => ({ group: 'edges' as const, ...e })),
          ],
          style: CYTO_STYLE,
          layout: {
            name: 'cose',
            animate: false,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: () => 120,
            nodeRepulsion: () => 8000,
          },
        })

        cy.on('tap', 'node', (e) => {
          setSelected(e.target.data())
        })

        cy.on('tap', (e) => {
          if (e.target === cy) setSelected(null)
        })

        cyRef.current = cy
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) setError(e.message)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      cyRef.current?.destroy()
    }
  }, [projectId])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
        <Link to="/" className="text-blue-400 hover:text-blue-300 font-medium">
          CodeAtlas
        </Link>
        <div className="text-sm text-slate-400">
          {stats.nodes} nodes / {stats.edges} edges
        </div>
      </header>

      {/* Graph + overlaid detail panel */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />

      </div>

      {/* Node detail modal */}
      {selected && (() => {
        const { incoming, outgoing } = getConnections(selected.id)
        const typeColor =
          selected.type === 'module' ? 'bg-blue-500' :
          selected.type === 'class' ? 'bg-green-500' :
          selected.type === 'function' ? 'bg-orange-500' : 'bg-slate-500'

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-label={`Details for ${selected.label}`}
              className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 outline-none overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${typeColor}`} />
                  <h2 className="text-lg font-mono text-white font-semibold">{selected.label}</h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-400 hover:text-white text-xl leading-none px-2 py-1 rounded hover:bg-slate-700 transition"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Properties */}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <span className="text-slate-400">Type</span>
                  <span className="text-white capitalize">{selected.type}</span>

                  <span className="text-slate-400">ID</span>
                  <span className="text-slate-300 font-mono text-xs break-all">{selected.id}</span>

                  {selected.file && (
                    <>
                      <span className="text-slate-400">File</span>
                      <span className="text-slate-300 font-mono text-xs">{selected.file}</span>
                    </>
                  )}

                  {selected.line > 0 && (
                    <>
                      <span className="text-slate-400">Line</span>
                      <span className="text-slate-300 font-mono">{selected.line}</span>
                    </>
                  )}
                </div>

                {/* Incoming connections */}
                {incoming.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">
                      Incoming ({incoming.length})
                    </h3>
                    <ul className="space-y-1">
                      {incoming.map((e) => (
                        <li key={e.data.id} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500 text-xs px-1.5 py-0.5 bg-slate-700 rounded">
                            {e.data.relationship}
                          </span>
                          <button
                            onClick={() => {
                              const node = graphElements?.nodes.find((n) => n.data.id === e.data.source)
                              if (node) setSelected(node.data)
                            }}
                            className="text-blue-400 hover:text-blue-300 font-mono text-xs truncate"
                          >
                            {getNodeLabel(e.data.source)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Outgoing connections */}
                {outgoing.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">
                      Outgoing ({outgoing.length})
                    </h3>
                    <ul className="space-y-1">
                      {outgoing.map((e) => (
                        <li key={e.data.id} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500 text-xs px-1.5 py-0.5 bg-slate-700 rounded">
                            {e.data.relationship}
                          </span>
                          <button
                            onClick={() => {
                              const node = graphElements?.nodes.find((n) => n.data.id === e.data.target)
                              if (node) setSelected(node.data)
                            }}
                            className="text-blue-400 hover:text-blue-300 font-mono text-xs truncate"
                          >
                            {getNodeLabel(e.data.target)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {incoming.length === 0 && outgoing.length === 0 && (
                  <p className="text-slate-500 text-sm">No connections</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
