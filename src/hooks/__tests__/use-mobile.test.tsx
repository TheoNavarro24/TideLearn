import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { useIsMobile } from "../use-mobile"

describe("useIsMobile", () => {
  function setupMatchMedia() {
    const listeners = new Set<() => void>()
    // @ts-expect-error - jsdom doesn't implement matchMedia
    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: (_event: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_event: string, cb: () => void) => listeners.delete(cb),
    }))
    return {
      trigger: () => listeners.forEach((cb) => cb()),
    }
  }

  it("reacts to width changes", async () => {
    const { trigger } = setupMatchMedia()
    window.innerWidth = 1024
    const { result } = renderHook(() => useIsMobile())
    await waitFor(() => expect(result.current).toBe(false))

    window.innerWidth = 500
    act(() => trigger())
    await waitFor(() => expect(result.current).toBe(true))
  })
})
