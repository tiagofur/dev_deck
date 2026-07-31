import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showToast, subscribeToasts } from './toast'

describe('toast system', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Clean up any remaining toasts by advancing timers
    vi.advanceTimersByTime(5000)
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should add a toast and notify subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)

    showToast('Hello World')

    expect(listener).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Hello World',
          variant: 'success',
        }),
      ])
    )

    unsubscribe()
  })

  it('should use the specified variant', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)

    showToast('Error occurred', 'error')

    expect(listener).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Error occurred',
          variant: 'error',
        }),
      ])
    )

    unsubscribe()
  })

  it('should remove the toast after TTL', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)

    showToast('Temporary')
    const toastsAfterShow = listener.mock.calls[listener.mock.calls.length - 1][0]
    const toastId = toastsAfterShow.find((t: any) => t.message === 'Temporary').id

    vi.advanceTimersByTime(2500)

    const toastsAfterTimer = listener.mock.calls[listener.mock.calls.length - 1][0]
    expect(toastsAfterTimer.some((t: any) => t.id === toastId)).toBe(false)

    unsubscribe()
  })

  it('should handle multiple toasts and remove them independently', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)

    showToast('Toast 1')
    vi.advanceTimersByTime(1000)
    showToast('Toast 2')

    let currentToasts = listener.mock.calls[listener.mock.calls.length - 1][0]
    expect(currentToasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Toast 1' }),
        expect.objectContaining({ message: 'Toast 2' }),
      ])
    )

    vi.advanceTimersByTime(1500) // Total 2500ms since Toast 1
    currentToasts = listener.mock.calls[listener.mock.calls.length - 1][0]
    expect(currentToasts.some((t: any) => t.message === 'Toast 1')).toBe(false)
    expect(currentToasts.some((t: any) => t.message === 'Toast 2')).toBe(true)

    vi.advanceTimersByTime(1000) // Total 2500ms since Toast 2
    currentToasts = listener.mock.calls[listener.mock.calls.length - 1][0]
    expect(currentToasts.some((t: any) => t.message === 'Toast 2')).toBe(false)

    unsubscribe()
  })

  it('should stop notifying after unsubscription', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)
    const callCountBeforeUnsubscribe = listener.mock.calls.length

    unsubscribe()
    showToast('Silent')

    expect(listener.mock.calls.length).toBe(callCountBeforeUnsubscribe)
  })
})
