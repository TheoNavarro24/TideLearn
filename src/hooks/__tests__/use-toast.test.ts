import { describe, it, expect } from "vitest"
import { reducer } from "../use-toast"

describe("toast reducer", () => {
  const toast = { id: "1", title: "hi", open: true }

  it("adds a toast", () => {
    const state = reducer({ toasts: [] }, { type: "ADD_TOAST", toast })
    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0]).toMatchObject(toast)
  })

  it("updates a toast", () => {
    const initial = { toasts: [toast] }
    const state = reducer(initial, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "updated" },
    })
    expect(state.toasts[0].title).toBe("updated")
  })

  it("dismisses a toast", () => {
    const initial = { toasts: [toast] }
    const state = reducer(initial, { type: "DISMISS_TOAST", toastId: "1" })
    expect(state.toasts[0].open).toBe(false)
  })
})
