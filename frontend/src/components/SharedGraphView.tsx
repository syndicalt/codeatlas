import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { fetchSharedGraph } from '../api/client'
import type { GraphElements } from '../types/graph'

export default function SharedGraphView() {
  const { shareId } = useParams<{ shareId: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })

  useEffect(() => {
    if (!shareId) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetchSharedGraph(shareId!)
        if (cancelled) return
        const elements = res.elements as GraphElements
        setStats({ nodes: elements.nodes.length, edges: elements.edges.length })
        setLoading(false)

        requestAnimationFrame(() => {
          if (cancelled || !containerRef.current) return
          cyRef.current?.destroy()
          cyRef.current = cytoscape({
            container: containerRef.current,
            elements: [
              ...elements.nodes.map((n) => ({ group: 'nodes' as const, ...n })),
              ...elements.edges.map((e) => ({ group: 'edges' as const, ...e })),
            ],
            style: [
              {
                selector: 'node',
                style: {
                  label: 'data(label)',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'font-size': '10px',
                  color: '#e2e8f0',
                  'text-outline-color': '#0f172a',
                  'text-outline-width': 1.5,
                  width: 'label',
                  height: 'label',
                  'padding-top': '8px',
                  'padding-bottom': '8px',
                  'padding-left': '12px',
                  'padding-right': '12px',
                  'background-color': '#3b82f6',
                  'border-width': 1.5,
                  'border-color': '#475569',
                } as any,
              },
              {
                selector: 'node.class',
                style: { 'background-color': '#22c55e', shape: 'diamond' } as any,
              },
              {
                selector: 'node.function',
                style: { 'background-color': '#f97316', shape: 'ellipse' } as any,
              },
              {
                selector: 'edge',
                style: {
                  width: 1.2,
                  'line-color': '#475569',
                  'target-arrow-color': '#475569',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                  opacity: 0.7,
                } as any,
              },
            ],
            layout: {
              name: 'cose',
              animate: true,
              animationDuration: 800,
              nodeDimensionsIncludeLabels: true,
              idealEdgeLength: () => 140,
              nodeRepulsion: () => 12000,
              gravity: 0.3,
              fit: true,
              padding: 40,
            } as any,
          })
        })
      } catch (e: any) {
        if (!cancelled) setError(e.message)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      cyRef.current?.destroy()
      cyRef.current = null
    }
  }, [shareId])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
      <header className="flex items-center justify-between px-4 py-2"
              style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <Link to="/" className="font-medium text-blue-400">CodeAtlas</Link>
        <span className="text-xs text-slate-400">
          Shared graph &middot; {stats.nodes}n / {stats.edges}e
        </span>
      </header>
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: '#0f172a' }}>
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: '#0f172a' }}>
            <p className="text-red-400">{error}</p>
          </div>
        )}
        <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      </div>
    </div>
  )
}
