import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LandingPage from './LandingPage'

// Mock auth context
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))

// Mock API calls
vi.mock('../api/client', () => ({
  ingestGitHub: vi.fn(),
  ingestUpload: vi.fn(),
  ingestDemo: vi.fn(),
  ingestImportJSON: vi.fn(),
}))

vi.mock('../api/auth', () => ({
  listAtlasHistory: vi.fn().mockResolvedValue([]),
}))

vi.mock('../hooks/useTaskPolling', () => ({
  useTaskPolling: () => null,
}))

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title and tagline', () => {
    renderLanding()
    expect(screen.getByText('CodeAtlas')).toBeInTheDocument()
    expect(screen.getByText('Transform codebases into interactive knowledge graphs')).toBeInTheDocument()
  })

  it('renders GitHub URL input', () => {
    renderLanding()
    expect(screen.getByPlaceholderText('https://github.com/owner/repo')).toBeInTheDocument()
  })

  it('has a Parse button that is disabled when input is empty', () => {
    renderLanding()
    const btn = screen.getByText('Parse')
    expect(btn).toBeDisabled()
  })

  it('enables Parse button when URL is entered', () => {
    renderLanding()
    const input = screen.getByPlaceholderText('https://github.com/owner/repo')
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } })
    expect(screen.getByText('Parse')).not.toBeDisabled()
  })

  it('renders the demo button', () => {
    renderLanding()
    expect(screen.getByText('Try Demo Project')).toBeInTheDocument()
  })

  it('shows Sign in button when not authenticated', () => {
    renderLanding()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders drop zone for zip/json files', () => {
    renderLanding()
    expect(screen.getByText(/Drop a .zip or exported .json file here/)).toBeInTheDocument()
  })

  it('renders history checkbox', () => {
    renderLanding()
    expect(screen.getByText(/Analyze full Git history/)).toBeInTheDocument()
  })
})
