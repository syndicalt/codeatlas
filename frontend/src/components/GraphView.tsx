import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'

cytoscape.use(fcose)
import {
  fetchGraph, searchGraph, filterGraph, exportGraphJSON,
  fetchTimeline, fetchGraphAtCommit, fetchContributors,
  createShareLink,
} from '../api/client'
import type {
  GraphElements, GraphNode, GraphEdge, DependencyScope,
  CommitInfo, ContributorInfo,
} from '../types/graph'
import TimeSlider from './TimeSlider'
import ChatPanel from './ChatPanel'
import { useAuth } from '../contexts/AuthContext'
import { listApiKeys } from '../api/auth'
import LoginModal from './LoginModal'
import { useCollaboration } from '../hooks/useCollaboration'

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
  highContrast: {
    name: 'Hi-Con',
    bg: '#000000', headerBg: '#000000', headerBorder: '#ffffff', panelBg: '#000000',
    panelBorder: '#ffffff', panelHeaderBorder: '#ffffff',
    textPrimary: '#ffffff', textSecondary: '#ffffff', textMuted: '#cccccc',
    inputBg: '#000000', inputBorder: '#ffffff', inputFocusBorder: '#ffff00',
    btnBg: '#333333', btnText: '#ffffff', btnHoverText: '#ffffff',
    btnActiveBg: '#ffff00', btnActiveText: '#000000',
    linkColor: '#00ffff', linkHover: '#ffffff',
    legendBg: 'rgba(0,0,0,0.95)', badgeBg: '#333333',
    nodeLabel: '#ffffff', nodeOutline: '#000000', edgeDefault: '#aaaaaa',
    module: '#0088ff', class: '#00ff00', function: '#ff8800', external: '#cccccc',
    externalBorder: '#ffffff', imports: '#00aaff', inherits: '#ff00ff', calls: '#ffff00',
    highlight: '#ff0000',
  },
}

const THEME_KEYS = Object.keys(THEMES)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCytoStyle(t: Theme): any[] {
  return [
    // --- Compound / directory group nodes ---
    {
      selector: 'node.group',
      style: {
        'background-color': t.panelBg,
        'background-opacity': 0.35,
        'border-width': 1,
        'border-color': t.panelBorder,
        'border-opacity': 0.5,
        'border-style': 'solid',
        shape: 'round-rectangle',
        'corner-radius': 8,
        label: 'data(label)',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': 10,
        'font-size': '11px',
        'font-weight': 'bold' as any,
        'font-family': 'Inter, system-ui, -apple-system, sans-serif',
        color: t.textMuted,
        'text-outline-color': t.bg,
        'text-outline-width': 2,
        'padding': '24px',
        'min-width': 60,
        'min-height': 40,
      } as any,
    },
    // --- Base node style ---
    {
      selector: 'node[type]',
      style: {
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '9px',
        'font-family': 'Inter, system-ui, -apple-system, sans-serif',
        color: t.nodeLabel,
        'text-outline-color': t.bg,
        'text-outline-width': 2,
        'text-max-width': '90px',
        'text-wrap': 'ellipsis',
        width: 'mapData(connections, 0, 20, 28, 64)',
        height: 'mapData(connections, 0, 20, 28, 64)',
        'background-opacity': 0.85,
        'border-width': 2,
        'border-opacity': 0.6,
        // Smooth transitions
        'transition-property': 'background-color, border-color, border-width, opacity, width, height',
        'transition-duration': '300ms',
        'transition-timing-function': 'ease-in-out-sine',
      } as any,
    },
    // --- Node types ---
    {
      selector: 'node.module',
      style: {
        'background-color': t.module,
        shape: 'round-rectangle',
        'border-color': t.module,
        'corner-radius': 4,
        'font-size': '10px',
        'font-weight': '600' as any,
        width: 'mapData(connections, 0, 20, 36, 72)',
        height: 'mapData(connections, 0, 20, 28, 48)',
        'text-max-width': '100px',
      } as any,
    },
    {
      selector: 'node.class',
      style: {
        'background-color': t.class,
        shape: 'round-rectangle',
        'border-color': t.class,
        'corner-radius': 12,
        'font-size': '9px',
        'font-weight': '500' as any,
      } as any,
    },
    {
      selector: 'node.function',
      style: {
        'background-color': t.function,
        shape: 'ellipse',
        'border-color': t.function,
        'font-size': '8px',
        'background-opacity': 0.75,
        'border-opacity': 0.4,
      } as any,
    },
    {
      selector: 'node.external',
      style: {
        'background-color': t.external,
        shape: 'round-rectangle',
        'corner-radius': 4,
        'border-style': 'dashed',
        'border-width': 1.5,
        'border-color': t.externalBorder,
        'border-opacity': 0.5,
        'background-opacity': 0.4,
        'font-size': '8px',
        'font-style': 'italic' as any,
        color: t.textMuted,
        width: 'mapData(connections, 0, 20, 24, 48)',
        height: 'mapData(connections, 0, 20, 24, 48)',
      } as any,
    },
    // --- Interaction states ---
    {
      selector: 'node:active',
      style: { 'overlay-color': t.highlight, 'overlay-opacity': 0.1 },
    },
    {
      selector: 'node.dimmed',
      style: { opacity: 0.1, 'transition-duration': '400ms' } as any,
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 3,
        'border-color': t.highlight,
        'border-opacity': 1,
        'background-opacity': 1,
        'z-index': 10,
        'font-size': '11px',
      } as any,
    },
    {
      selector: 'node.added',
      style: {
        'border-width': 3, 'border-color': '#22c55e', 'border-opacity': 1,
        'background-opacity': 1,
      } as any,
    },
    {
      selector: 'node.removed',
      style: {
        opacity: 0.2, 'border-width': 2, 'border-color': '#ef4444', 'border-style': 'dashed',
      } as any,
    },
    {
      selector: 'node.modified',
      style: {
        'border-width': 3, 'border-color': '#eab308', 'border-opacity': 1,
        'background-opacity': 1,
      } as any,
    },
    // --- Edges ---
    {
      selector: 'edge',
      style: {
        width: 0.8,
        'line-color': t.edgeDefault,
        'target-arrow-color': t.edgeDefault,
        'target-arrow-shape': 'triangle-backcurve',
        'arrow-scale': 0.5,
        'curve-style': 'unbundled-bezier',
        'control-point-distances': [20],
        'control-point-weights': [0.5],
        opacity: 0.35,
        'transition-property': 'opacity, line-color, width',
        'transition-duration': '300ms',
      } as any,
    },
    {
      selector: 'edge[relationship = "contains"]',
      style: {
        'line-color': t.edgeDefault,
        'target-arrow-color': t.edgeDefault,
        'target-arrow-shape': 'none',
        'line-style': 'solid',
        width: 0.5,
        opacity: 0.15,
        'curve-style': 'straight',
      },
    },
    {
      selector: 'edge[relationship = "imports"]',
      style: {
        'line-color': t.imports,
        'target-arrow-color': t.imports,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 4],
        width: 1,
        opacity: 0.4,
      },
    },
    {
      selector: 'edge[relationship = "inherits"]',
      style: {
        'line-color': t.inherits,
        'target-arrow-color': t.inherits,
        'target-arrow-shape': 'triangle',
        width: 1.5,
        opacity: 0.6,
      },
    },
    {
      selector: 'edge[relationship = "calls"]',
      style: {
        'line-color': t.calls,
        'target-arrow-color': t.calls,
        'line-style': 'dotted',
        'line-dash-pattern': [2, 3],
        width: 0.7,
        opacity: 0.25,
      },
    },
    { selector: 'edge.dimmed', style: { opacity: 0.03 } },
    // --- Hover/selected edge emphasis ---
    {
      selector: 'node.highlighted ~ edge, edge.highlighted',
      style: { opacity: 0.8, width: 1.5 } as any,
    },
  ]
}

const LARGE_GRAPH_THRESHOLD = 2000

/** Get layout options optimized for graph size */
function getLayoutOptions(nodeCount: number, animated = true) {
  if (nodeCount > LARGE_GRAPH_THRESHOLD) {
    return {
      name: 'fcose',
      animate: false,
      quality: 'default' as const,
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 100,
      nodeRepulsion: 6000,
      edgeElasticity: 0.2,
      gravity: 0.5,
      gravityRange: 2.0,
      numIter: 3000,
      fit: true,
      padding: 50,
      randomize: true,
      packComponents: true,
    }
  }
  // Use fcose for all graphs — it supports compound nodes and produces cleaner layouts
  return {
    name: 'fcose',
    animate: animated,
    animationDuration: animated ? 900 : 0,
    animationEasing: 'ease-out-cubic' as const,
    quality: 'proof' as const,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: nodeCount < 50 ? 160 : nodeCount < 200 ? 120 : 90,
    nodeRepulsion: nodeCount < 50 ? 15000 : nodeCount < 200 ? 10000 : 6000,
    edgeElasticity: 0.3,
    gravity: 0.25,
    gravityRange: 3.8,
    gravityCompound: 1.5,
    gravityRangeCompound: 2.0,
    numIter: 2500,
    fit: true,
    padding: 60,
    randomize: false,
    packComponents: true,
    nestingFactor: 0.15,
    tile: true,
    tilingPaddingVertical: 16,
    tilingPaddingHorizontal: 16,
  }
}

/** Create a Cytoscape instance with animated entry */
function createCy(
  container: HTMLElement,
  elements: GraphElements,
  theme: Theme,
  onTapNode: (data: any) => void,
  onTapBg: () => void,
  animated = true,
): cytoscape.Core {
  const nodeCount = elements.nodes.length
  const isLarge = nodeCount > LARGE_GRAPH_THRESHOLD

  const cy = cytoscape({
    container,
    elements: [
      ...elements.nodes.map((n) => ({ group: 'nodes' as const, ...n })),
      ...elements.edges.map((e) => ({ group: 'edges' as const, ...e })),
    ],
    style: buildCytoStyle(theme),
    layout: getLayoutOptions(nodeCount, animated),
    // Performance: disable expensive features for large graphs
    textureOnViewport: isLarge,
    hideEdgesOnViewport: isLarge,
    hideLabelsOnViewport: isLarge,
  } as any)

  // Fade-in: start transparent and animate to full opacity
  if (animated) {
    cy.elements().style('opacity', 0)
    const startTime = performance.now()
    const duration = 500 // ms
    const fadeIn = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      cy.elements().style('opacity', ease)
      if (progress < 1) requestAnimationFrame(fadeIn)
    }
    // Start fade after layout begins positioning
    setTimeout(() => requestAnimationFrame(fadeIn), 300)
  }

  cy.on('tap', 'node', (ev) => onTapNode(ev.target.data()))
  cy.on('tap', (ev) => { if (ev.target === cy) onTapBg() })
  return cy
}

/** Morph an existing Cytoscape instance to new elements (for history transitions) */
function morphGraph(
  cy: cytoscape.Core,
  elements: GraphElements,
  delta: { added_nodes: string[]; removed_nodes: string[]; modified_nodes: string[] } | null,
) {
  const newNodeIds = new Set(elements.nodes.map((n) => n.data.id))
  const newEdgeIds = new Set(elements.edges.map((e) => e.data.id))
  const existingNodeIds = new Set(cy.nodes().map((n) => n.id()))
  const existingEdgeIds = new Set(cy.edges().map((e) => e.id()))

  // Remove nodes/edges that are no longer present (animate fade-out)
  cy.nodes().forEach((n) => {
    if (!newNodeIds.has(n.id())) {
      n.animate({ style: { opacity: 0 } as any, duration: 300, complete: () => n.remove() })
    }
  })
  cy.edges().forEach((e) => {
    if (!newEdgeIds.has(e.id())) {
      e.animate({ style: { opacity: 0 } as any, duration: 200, complete: () => e.remove() })
    }
  })

  // Update existing nodes' data
  for (const node of elements.nodes) {
    if (existingNodeIds.has(node.data.id)) {
      const el = cy.$id(node.data.id)
      el.data(node.data)
      el.removeClass('added modified removed')
    }
  }

  // Add new nodes (start invisible, fade in)
  const nodesToAdd = elements.nodes.filter((n) => !existingNodeIds.has(n.data.id))
  const edgesToAdd = elements.edges.filter((e) => !existingEdgeIds.has(e.data.id))

  if (nodesToAdd.length > 0 || edgesToAdd.length > 0) {
    const added = cy.add([
      ...nodesToAdd.map((n) => ({ group: 'nodes' as const, ...n })),
      ...edgesToAdd.map((e) => ({ group: 'edges' as const, ...e })),
    ])
    added.style('opacity', 0)
    // Fade new elements in after layout starts
    setTimeout(() => {
      added.animate({ style: { opacity: 1 } as any, duration: 400 })
    }, 100)
  }

  // Update existing edges' data
  for (const edge of elements.edges) {
    if (existingEdgeIds.has(edge.data.id)) {
      cy.$id(edge.data.id).data(edge.data)
    }
  }

  // Re-run layout with animation
  const morphLayout = getLayoutOptions(cy.nodes().length, true)
  cy.layout({
    ...morphLayout,
    animate: true,
    animationDuration: 600,
    fit: true,
  } as any).run()

  // Apply delta classes
  if (delta) {
    setTimeout(() => {
      delta.added_nodes.forEach((id) => cy.$id(id).addClass('added'))
      delta.modified_nodes.forEach((id) => cy.$id(id).addClass('modified'))
    }, 150)
  }
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
  const themeRef = useRef(theme)
  themeRef.current = theme

  // History state
  const [historyMode, setHistoryMode] = useState(false)
  const [timeline, setTimeline] = useState<CommitInfo[] | null>(null)
  const [commitIndex, setCommitIndex] = useState(0)
  const [historyAvailable, setHistoryAvailable] = useState(false)
  const [contributors, setContributors] = useState<Record<string, ContributorInfo> | null>(null)
  const [showContributors, setShowContributors] = useState(false)

  // Panel tab: 'details' or 'chat'
  const [panelTab, setPanelTab] = useState<'details' | 'chat'>('details')

  // Auth state
  const { user, logout } = useAuth()
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('codeatlas-panel-width')
    return saved ? Math.max(240, Math.min(800, Number(saved))) : 320
  })
  const isDraggingRef = useRef(false)

  // Collaboration
  const { peers, connected: collabConnected } = useCollaboration(projectId)

  useEffect(() => {
    if (user) {
      listApiKeys().then((keys) => setHasApiKey(keys.length > 0)).catch(() => {})
    } else {
      setHasApiKey(false)
    }
  }, [user])

  const panelWidthRef = useRef(panelWidth)
  panelWidthRef.current = panelWidth

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    const startX = e.clientX
    const startWidth = panelWidthRef.current

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = startX - ev.clientX
      const newWidth = Math.max(240, Math.min(800, startWidth + delta))
      setPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem('codeatlas-panel-width', String(panelWidthRef.current))
      cyRef.current?.resize()
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

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

  // Resize Cytoscape when panel is toggled or resized
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.resize()
    const timer = setTimeout(() => { cy.resize() }, 250)
    return () => clearTimeout(timer)
  }, [panelOpen, panelWidth])

  // Update Cytoscape style when theme changes
  useEffect(() => {
    localStorage.setItem('codeatlas-theme', themeKey)
    const cy = cyRef.current
    if (cy) cy.style(buildCytoStyle(theme))
  }, [themeKey, theme])

  // Load graph data and render
  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetchGraph(projectId!)
        if (cancelled) return
        const elements = res.elements as GraphElements
        setGraphElements(elements)
        setStats({ nodes: elements.nodes.length, edges: elements.edges.length })
        setLoading(false)

        // Wait for loading overlay to be removed and container to have dimensions
        requestAnimationFrame(() => {
          if (cancelled || !containerRef.current) return
          requestAnimationFrame(() => {
            if (cancelled || !containerRef.current) return
            cyRef.current?.destroy()
            cyRef.current = createCy(
              containerRef.current,
              elements,
              themeRef.current,
              (data) => setSelected(data),
              () => setSelected(null),
              true, // animated
            )
          })
        })

        // Check if history data is available
        fetchTimeline(projectId!).then((tl) => {
          if (!cancelled && tl.commits.length > 0) {
            setTimeline(tl.commits)
            setHistoryAvailable(true)
            setCommitIndex(tl.commits.length - 1)
          }
        }).catch(() => {})
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

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

  // History mode: load graph snapshot when commit changes
  const handleCommitChange = useCallback((index: number) => {
    if (!timeline || !projectId || !containerRef.current) return
    const clamped = Math.max(0, Math.min(index, timeline.length - 1))
    setCommitIndex(clamped)
    const sha = timeline[clamped].sha

    fetchGraphAtCommit(projectId, sha).then((res) => {
      const elements = res.elements as GraphElements
      setGraphElements(elements)
      setStats({ nodes: elements.nodes.length, edges: elements.edges.length })

      const cy = cyRef.current
      if (cy) {
        // Morph the existing graph smoothly
        morphGraph(cy, elements, res.delta)
      } else if (containerRef.current) {
        // Fallback: create fresh if no existing instance
        cyRef.current = createCy(
          containerRef.current, elements, themeRef.current,
          (data) => setSelected(data), () => setSelected(null), true,
        )
        if (res.delta) {
          setTimeout(() => {
            res.delta!.added_nodes.forEach((id) => cyRef.current?.$id(id).addClass('added'))
            res.delta!.modified_nodes.forEach((id) => cyRef.current?.$id(id).addClass('modified'))
          }, 200)
        }
      }
    }).catch(() => {})
  }, [timeline, projectId])

  // Toggle history mode: reload latest graph when exiting
  const toggleHistoryMode = useCallback(() => {
    if (historyMode) {
      // Exit history mode — reload the latest graph with animation
      setHistoryMode(false)
      if (projectId) {
        fetchGraph(projectId).then((res) => {
          const elements = res.elements as GraphElements
          setGraphElements(elements)
          setStats({ nodes: elements.nodes.length, edges: elements.edges.length })
          cyRef.current?.destroy()
          cyRef.current = createCy(
            containerRef.current!, elements, themeRef.current,
            (data) => setSelected(data), () => setSelected(null), true,
          )
        }).catch(() => {})
      }
    } else {
      setHistoryMode(true)
      if (timeline) {
        handleCommitChange(timeline.length - 1)
      }
    }
  }, [historyMode, projectId, timeline, handleCommitChange])

  // Toggle contributor view
  const toggleContributors = useCallback(() => {
    if (showContributors) {
      setShowContributors(false)
      setContributors(null)
      // Clear contributor highlighting
      cyRef.current?.elements().removeClass('dimmed highlighted')
    } else if (projectId) {
      fetchContributors(projectId).then((res) => {
        setContributors(res.contributors)
        setShowContributors(true)
      }).catch(() => {})
    }
  }, [showContributors, projectId])

  // Highlight specific node IDs (used by chat panel)
  const highlightNodeIds = useCallback((nodeIds: string[]) => {
    const cy = cyRef.current
    if (!cy) return
    const idSet = new Set(nodeIds)
    cy.nodes().forEach((n) => {
      if (idSet.has(n.id())) {
        n.removeClass('dimmed').addClass('highlighted')
      } else {
        n.removeClass('highlighted').addClass('dimmed')
      }
    })
    cy.edges().forEach((e) => {
      if (idSet.has(e.data('source')) || idSet.has(e.data('target'))) {
        e.removeClass('dimmed')
      } else {
        e.addClass('dimmed')
      }
    })
  }, [])

  // Highlight nodes for a specific contributor
  const highlightContributor = useCallback((files: string[]) => {
    const cy = cyRef.current
    if (!cy) return
    const fileSet = new Set(files)
    cy.nodes().forEach((n) => {
      const nodeFile = n.data('file')
      if (nodeFile && fileSet.has(nodeFile)) {
        n.removeClass('dimmed').addClass('highlighted')
      } else {
        n.removeClass('highlighted').addClass('dimmed')
      }
    })
    cy.edges().forEach((e) => {
      const srcFile = cy.$id(e.data('source')).data('file')
      const tgtFile = cy.$id(e.data('target')).data('file')
      if ((srcFile && fileSet.has(srcFile)) || (tgtFile && fileSet.has(tgtFile))) {
        e.removeClass('dimmed')
      } else {
        e.addClass('dimmed')
      }
    })
  }, [])

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
      cyRef.current = createCy(
        containerRef.current, elements, themeRef.current,
        (data) => setSelected(data), () => setSelected(null), true,
      )
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

  const handleShare = async () => {
    if (!projectId) return
    try {
      const { share_id } = await createShareLink(projectId)
      const url = `${window.location.origin}/shared/${share_id}`
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
    } catch {}
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg }}>
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
            aria-label="Search graph nodes"
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

        {/* Export + history + stats */}
        <div className="flex items-center gap-2 shrink-0">
          {historyAvailable && (
            <button
              onClick={toggleHistoryMode}
              className="px-2.5 py-1 text-xs rounded transition"
              style={{
                backgroundColor: historyMode ? theme.btnActiveBg : theme.btnBg,
                color: historyMode ? theme.btnActiveText : theme.btnText,
              }}
              title="Toggle history timeline"
            >
              History
            </button>
          )}
          {historyAvailable && (
            <button
              onClick={toggleContributors}
              className="px-2.5 py-1 text-xs rounded transition"
              style={{
                backgroundColor: showContributors ? theme.btnActiveBg : theme.btnBg,
                color: showContributors ? theme.btnActiveText : theme.btnText,
              }}
              title="Toggle contributor view"
            >
              Contributors
            </button>
          )}
          {/* Collaboration presence */}
          {collabConnected && peers.length > 0 && (
            <div className="flex items-center gap-0.5" title={`${peers.length + 1} collaborator${peers.length > 0 ? 's' : ''} online`}>
              {peers.slice(0, 5).map((p) => (
                <span key={p.id} className="w-2.5 h-2.5 rounded-full border border-black/30"
                      style={{ backgroundColor: p.color }} />
              ))}
              {peers.length > 5 && (
                <span className="text-[10px] ml-0.5" style={{ color: theme.textMuted }}>+{peers.length - 5}</span>
              )}
            </div>
          )}
          <button
            onClick={handleShare}
            className="px-2.5 py-1 text-xs rounded transition"
            style={{
              backgroundColor: shareUrl ? theme.btnActiveBg : theme.btnBg,
              color: shareUrl ? theme.btnActiveText : theme.btnText,
            }}
            title={shareUrl ? 'Link copied!' : 'Share graph link'}
          >
            {shareUrl ? 'Copied!' : 'Share'}
          </button>
          <button
            onClick={() => { setPanelTab('chat'); setPanelOpen(true) }}
            className="px-2.5 py-1 text-xs rounded transition relative"
            style={{
              backgroundColor: panelTab === 'chat' && panelOpen ? theme.btnActiveBg : theme.btnBg,
              color: panelTab === 'chat' && panelOpen ? theme.btnActiveText : theme.btnText,
            }}
            title="Ask AI about this codebase"
          >
            Ask AI
            {user && !hasApiKey && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" title="No API key configured" />
            )}
          </button>
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
          {/* User menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-7 h-7 rounded-full overflow-hidden border-2 transition"
                style={{ borderColor: showUserMenu ? theme.btnActiveBg : theme.btnBg }}
                title={user.name || user.email}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium"
                       style={{ backgroundColor: theme.btnActiveBg, color: theme.btnActiveText }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 top-9 z-50 w-44 rounded-lg shadow-lg py-1 text-sm"
                  style={{ backgroundColor: theme.panelBg, border: `1px solid ${theme.panelBorder}` }}
                >
                  <div className="px-3 py-2 truncate" style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.panelHeaderBorder}` }}>
                    {user.email}
                  </div>
                  <Link
                    to="/settings"
                    className="block px-3 py-2 transition hover:opacity-80"
                    style={{ color: theme.textPrimary }}
                    onClick={() => setShowUserMenu(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => { logout(); setShowUserMenu(false) }}
                    className="w-full text-left px-3 py-2 transition hover:opacity-80"
                    style={{ color: theme.textSecondary }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-2.5 py-1 text-xs rounded transition"
              style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
            >
              Sign in
            </button>
          )}

          <span className="text-xs" style={{ color: theme.textMuted }}>
            {stats.nodes}n / {stats.edges}e
          </span>
        </div>
      </header>

      {/* Time slider (shown in history mode) */}
      {historyMode && timeline && (
        <TimeSlider
          commits={timeline}
          currentIndex={commitIndex}
          onIndexChange={handleCommitChange}
          theme={theme}
        />
      )}

      {/* Split view: graph + detail panel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Graph canvas — fills remaining space */}
        <div style={{ flex: '1 1 0%', position: 'relative', minHeight: 0, minWidth: 0 }}>
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
          <div ref={containerRef} role="application" aria-label="Code knowledge graph" tabIndex={0}
               style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

          {/* Screen reader announcements */}
          <div aria-live="polite" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            {selected ? `Selected ${selected.type} node: ${selected.label}, ${selected.connections} connections` : ''}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 text-[10px] px-3 py-2.5 rounded-lg backdrop-blur-sm" role="legend" aria-label="Graph legend"
               style={{ backgroundColor: theme.legendBg, color: theme.textSecondary, border: `1px solid ${theme.panelBorder}` }}>
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: theme.module }} /> Module
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.class }} /> Class
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.function }} /> Function
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm opacity-60" style={{ backgroundColor: theme.external, border: `1px dashed ${theme.externalBorder}` }} /> External
              </span>
            </div>
            <div className="flex gap-3" style={{ color: theme.textMuted }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed" style={{ borderColor: theme.imports }} /> imports
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t-2" style={{ borderColor: theme.inherits }} /> inherits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t border-dotted" style={{ borderColor: theme.calls }} /> calls
              </span>
            </div>
          </div>
        </div>

        {/* Detail panel (right side) — resizable */}
        {panelOpen && (
          <div
            onMouseDown={handleResizeStart}
            style={{
              width: 4,
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              flexShrink: 0,
              position: 'relative',
              zIndex: 10,
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 1,
              width: 2,
              backgroundColor: theme.panelBorder,
              transition: 'background-color 0.15s',
            }} />
          </div>
        )}
        <div
          className="flex flex-col min-h-0 overflow-hidden"
          style={{
            width: panelOpen ? panelWidth : 0,
            flexShrink: 0,
            backgroundColor: theme.panelBg,
            borderLeft: panelOpen ? `1px solid ${theme.panelBorder}` : 'none',
            transition: panelOpen ? 'none' : 'width 0.2s',
          }}
        >
          <div className="flex flex-col h-full" style={{ minWidth: panelWidth }}>
            {/* Tab switcher */}
            <div className="flex shrink-0" style={{ borderBottom: `1px solid ${theme.panelHeaderBorder}` }}>
              <button
                onClick={() => setPanelTab('details')}
                className="flex-1 px-4 py-2 text-sm font-medium transition"
                style={{
                  color: panelTab === 'details' ? theme.textPrimary : theme.textMuted,
                  borderBottom: panelTab === 'details' ? `2px solid ${theme.btnActiveBg}` : '2px solid transparent',
                }}
              >
                Details
              </button>
              <button
                onClick={() => setPanelTab('chat')}
                className="flex-1 px-4 py-2 text-sm font-medium transition"
                style={{
                  color: panelTab === 'chat' ? theme.textPrimary : theme.textMuted,
                  borderBottom: panelTab === 'chat' ? `2px solid ${theme.btnActiveBg}` : '2px solid transparent',
                }}
              >
                Ask AI
              </button>
            </div>

            {/* Details tab */}
            {panelTab === 'details' && (
              <>
                {/* Contributors section (collapsible, shown when active) */}
                {showContributors && contributors && (
                  <>
                    <div className="px-4 py-2.5 text-sm font-medium shrink-0"
                         style={{ borderBottom: `1px solid ${theme.panelHeaderBorder}`, color: theme.textSecondary }}>
                      Contributors
                    </div>
                    <div className="overflow-y-auto shrink-0" style={{ maxHeight: '40%' }}>
                      <div className="p-3 space-y-1">
                        {Object.entries(contributors).map(([email, info]) => (
                          <button
                            key={email}
                            onClick={() => highlightContributor(info.files)}
                            className="w-full text-left px-3 py-2 rounded text-sm transition hover:opacity-80"
                            style={{ backgroundColor: theme.badgeBg }}
                          >
                            <div className="font-medium" style={{ color: theme.textPrimary }}>{info.name}</div>
                            <div className="text-xs" style={{ color: theme.textMuted }}>
                              {info.commit_count} commits &middot; {info.files.length} files
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => cyRef.current?.elements().removeClass('dimmed highlighted')}
                          className="w-full text-center px-3 py-1.5 rounded text-xs mt-2"
                          style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
                        >
                          Clear highlight
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Node details */}
                <div className="px-4 py-2.5 text-sm font-medium shrink-0"
                     style={{ borderBottom: `1px solid ${theme.panelHeaderBorder}`, color: theme.textSecondary }}>
                  Node Details
                </div>
                <div className="flex-1 overflow-y-auto">
                  {renderDetailPanel()}
                </div>
              </>
            )}

            {/* Chat tab */}
            {panelTab === 'chat' && projectId && (
              <ChatPanel
                projectId={projectId}
                theme={theme}
                onHighlightNodes={highlightNodeIds}
                isSignedIn={!!user}
                hasApiKey={hasApiKey}
              />
            )}
          </div>
        </div>
      </div>

      {/* Login modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}
