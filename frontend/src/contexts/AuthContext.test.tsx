import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../api/auth', () => ({
  fetchMe: vi.fn().mockRejectedValue(new Error('no token')),
}))

function TestConsumer() {
  const { user, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides null user when no token exists', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    expect(await screen.findByTestId('user')).toHaveTextContent('none')
  })

  it('clears token on logout', async () => {
    localStorage.setItem('codeatlas-token', 'fake')
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    const btn = await screen.findByText('logout')
    act(() => btn.click())
    expect(localStorage.getItem('codeatlas-token')).toBeNull()
  })
})
