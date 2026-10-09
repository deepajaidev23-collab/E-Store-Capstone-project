import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

describe('useOnlineStatus', () => {
  it('defaults to true when online', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it('updates state when offline/online events fire', () => {
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })
})
