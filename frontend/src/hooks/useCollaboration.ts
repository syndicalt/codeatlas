import { useEffect, useRef, useState, useCallback } from 'react'

export interface Peer {
  id: string
  color: string
}

interface CollaborationMessage {
  type: string
  peer?: Peer
  peers?: Peer[]
  peer_count?: number
  node_id?: string
  [key: string]: unknown
}

export function useCollaboration(projectId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null)
  const [peers, setPeers] = useState<Peer[]>([])
  const [selfPeer, setSelfPeer] = useState<Peer | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/${projectId}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setPeers([])
      setSelfPeer(null)
    }

    ws.onmessage = (event) => {
      try {
        const msg: CollaborationMessage = JSON.parse(event.data)
        switch (msg.type) {
          case 'connected':
            if (msg.peer) setSelfPeer(msg.peer)
            break
          case 'peer_list':
            if (msg.peers) setPeers(msg.peers)
            break
          case 'peer_joined':
            if (msg.peer) setPeers((prev) => [...prev, msg.peer!])
            break
          case 'peer_left':
            if (msg.peer) setPeers((prev) => prev.filter((p) => p.id !== msg.peer!.id))
            break
        }
      } catch {}
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [projectId])

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const broadcastNodeSelect = useCallback((nodeId: string) => {
    send({ type: 'node_select', node_id: nodeId })
  }, [send])

  return { peers, selfPeer, connected, send, broadcastNodeSelect }
}
