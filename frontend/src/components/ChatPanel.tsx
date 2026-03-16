import { useState, useRef, useEffect, useCallback } from 'react'
import { ragQuery } from '../api/client'
import type { ChatMessage, GraphElements } from '../types/graph'

interface ChatPanelProps {
  projectId: string
  theme: {
    panelBg: string
    panelBorder: string
    panelHeaderBorder: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    inputBg: string
    inputBorder: string
    inputFocusBorder: string
    btnActiveBg: string
    btnActiveText: string
    btnBg: string
    btnText: string
    linkColor: string
    badgeBg: string
    bg: string
  }
  onHighlightNodes?: (nodeIds: string[]) => void
  onShowSubgraph?: (elements: GraphElements) => void
  isSignedIn?: boolean
  hasApiKey?: boolean
}

export default function ChatPanel({ projectId, theme, onHighlightNodes, onShowSubgraph, isSignedIn, hasApiKey }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await ragQuery(projectId, text, conversationId)
      setConversationId(res.conversation_id)

      const assistantMsg: ChatMessage = {
        id: res.message_id || `assistant-${Date.now()}`,
        role: 'assistant',
        text: res.text,
        highlighted_nodes: res.highlighted_nodes,
        subgraph_elements: res.subgraph_elements,
        code_snippets: res.code_snippets,
        confidence: res.confidence,
        follow_up_suggestions: res.follow_up_suggestions,
        is_local_only: res.is_local_only,
      }
      setMessages((prev) => [...prev, assistantMsg])

      // Highlight nodes in the graph
      if (res.highlighted_nodes.length > 0 && onHighlightNodes) {
        onHighlightNodes(res.highlighted_nodes)
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: `Error: ${err.message}`,
          confidence: 'low',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, projectId, conversationId, onHighlightNodes])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const chatDisabled = isSignedIn === true && hasApiKey === false

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Auth/API key warnings */}
      {isSignedIn === false && (
        <div className="shrink-0 px-3 py-2 text-xs text-center"
             style={{ backgroundColor: theme.badgeBg, color: theme.textSecondary, borderBottom: `1px solid ${theme.panelHeaderBorder}` }}>
          <a href="/settings" style={{ color: theme.linkColor }}>Sign in</a> to use Ask AI with your own API key
        </div>
      )}
      {isSignedIn === true && hasApiKey === false && (
        <div className="shrink-0 px-3 py-2 text-xs text-center"
             style={{ backgroundColor: theme.badgeBg, color: theme.textSecondary, borderBottom: `1px solid ${theme.panelHeaderBorder}` }}>
          <a href="/settings" style={{ color: theme.linkColor }}>Configure an API key</a> in Settings to use Ask AI
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm" style={{ color: theme.textMuted }}>
              Ask questions about the codebase
            </p>
            <div className="space-y-1.5">
              {[
                'What are the main modules?',
                'Show me all class hierarchies',
                'Which functions have the most connections?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestionClick(q)}
                  className="block w-full text-left text-xs px-3 py-2 rounded transition hover:opacity-80"
                  style={{ backgroundColor: theme.badgeBg, color: theme.textSecondary }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: msg.role === 'user' ? theme.btnActiveBg : theme.badgeBg,
                color: msg.role === 'user' ? theme.btnActiveText : theme.textPrimary,
              }}
            >
              {/* Message text — render markdown-like with line breaks */}
              <div className="whitespace-pre-wrap break-words" style={{ lineHeight: 1.5 }}>
                {msg.text}
              </div>

              {/* Highlighted nodes badge */}
              {msg.highlighted_nodes && msg.highlighted_nodes.length > 0 && (
                <button
                  onClick={() => onHighlightNodes?.(msg.highlighted_nodes!)}
                  className="mt-2 text-xs px-2 py-1 rounded transition hover:opacity-80"
                  style={{ backgroundColor: theme.bg, color: theme.linkColor }}
                >
                  Highlight {msg.highlighted_nodes.length} node{msg.highlighted_nodes.length > 1 ? 's' : ''}
                </button>
              )}

              {/* Subgraph button */}
              {msg.subgraph_elements && (
                <button
                  onClick={() => onShowSubgraph?.(msg.subgraph_elements!)}
                  className="mt-1 ml-1 text-xs px-2 py-1 rounded transition hover:opacity-80"
                  style={{ backgroundColor: theme.bg, color: theme.linkColor }}
                >
                  Show subgraph
                </button>
              )}

              {/* Code snippets */}
              {msg.code_snippets && msg.code_snippets.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.code_snippets.map((s, i) => (
                    <div key={i} className="text-xs font-mono px-2 py-1 rounded"
                         style={{ backgroundColor: theme.bg, color: theme.textSecondary }}>
                      {s.label && <span style={{ color: theme.linkColor }}>{s.label}</span>}
                      {' '}{s.file}:{s.start_line}
                    </div>
                  ))}
                </div>
              )}

              {/* Confidence + local-only indicator */}
              {msg.role === 'assistant' && (
                <div className="mt-1.5 flex items-center gap-2">
                  {msg.is_local_only && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: theme.bg, color: theme.textMuted }}>
                      local only
                    </span>
                  )}
                  {msg.confidence && msg.confidence !== 'medium' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: theme.bg, color: theme.textMuted }}>
                      {msg.confidence} confidence
                    </span>
                  )}
                </div>
              )}

              {/* Follow-up suggestions */}
              {msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.follow_up_suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-[10px] px-2 py-1 rounded transition hover:opacity-80"
                      style={{ backgroundColor: theme.bg, color: theme.linkColor, border: `1px solid ${theme.inputBorder}` }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: theme.badgeBg }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme.textMuted, animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme.textMuted, animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme.textMuted, animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3" style={{ borderTop: `1px solid ${theme.panelHeaderBorder}` }}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the codebase..."
            disabled={loading || chatDisabled}
            className="flex-1 px-3 py-2 rounded text-sm focus:outline-none"
            style={{
              backgroundColor: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              color: theme.textPrimary,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || chatDisabled}
            className="px-3 py-2 rounded text-sm transition"
            style={{
              backgroundColor: input.trim() ? theme.btnActiveBg : theme.btnBg,
              color: input.trim() ? theme.btnActiveText : theme.btnText,
              opacity: loading ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
