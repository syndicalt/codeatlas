import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChatPanel from './ChatPanel'

vi.mock('../api/client', () => ({
  ragQuery: vi.fn(),
}))

const mockTheme = {
  panelBg: '#1e293b',
  panelBorder: '#334155',
  panelHeaderBorder: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  inputBg: '#0f172a',
  inputBorder: '#475569',
  inputFocusBorder: '#3b82f6',
  btnActiveBg: '#2563eb',
  btnActiveText: '#ffffff',
  btnBg: '#334155',
  btnText: '#94a3b8',
  linkColor: '#60a5fa',
  badgeBg: '#334155',
  bg: '#0f172a',
}

describe('ChatPanel', () => {
  it('renders suggestion questions when empty', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} />)
    expect(screen.getByText('What are the main modules?')).toBeInTheDocument()
    expect(screen.getByText('Show me all class hierarchies')).toBeInTheDocument()
  })

  it('renders the input field', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} />)
    expect(screen.getByPlaceholderText('Ask about the codebase...')).toBeInTheDocument()
  })

  it('shows sign-in banner when not signed in', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} isSignedIn={false} />)
    expect(screen.getByText(/Sign in/)).toBeInTheDocument()
  })

  it('shows API key warning when signed in without key', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} isSignedIn={true} hasApiKey={false} />)
    expect(screen.getByText(/Configure an API key/)).toBeInTheDocument()
  })

  it('disables input when signed in without API key', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} isSignedIn={true} hasApiKey={false} />)
    const input = screen.getByPlaceholderText('Ask about the codebase...')
    expect(input).toBeDisabled()
  })

  it('enables input when signed in with API key', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} isSignedIn={true} hasApiKey={true} />)
    const input = screen.getByPlaceholderText('Ask about the codebase...')
    expect(input).not.toBeDisabled()
  })

  it('clicking suggestion populates input', () => {
    render(<ChatPanel projectId="test" theme={mockTheme} />)
    fireEvent.click(screen.getByText('What are the main modules?'))
    const input = screen.getByPlaceholderText('Ask about the codebase...') as HTMLInputElement
    expect(input.value).toBe('What are the main modules?')
  })
})
