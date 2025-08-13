import { useEffect, useState } from "react"
import { decompressFromEncodedURIComponent } from "lz-string"
import type { Course } from "@/types/course"
import { validateCourse } from "@/validate/course"
import { validateOps } from "@/validate/ops"

type Result =
  | { status: "idle" }
  | { status: "create"; course: Course; summary: string }
  | { status: "patch"; ops: unknown[]; summary: string }
  | { status: "error"; summary: string }

export function useDeepLinkIntents(): Result {
  const [result, setResult] = useState<Result>({ status: "idle" })

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash)
    const intent = params.get("intent")
    const version = params.get("v")
    if (version !== "1") return

    const fail = (summary: string) => {
      alert(summary)
      setResult({ status: "error", summary })
    }

    try {
      if (intent === "create") {
        const payload = params.get("course")
        if (!payload) return fail("Missing course payload")
        const decompressed = decompressFromEncodedURIComponent(payload)
        if (!decompressed) return fail("Could not decode course")
        const parsed = JSON.parse(decompressed)
        const validation = validateCourse(parsed)
        if (!validation.ok || !validation.course) return fail(validation.summary)
        setResult({ status: "create", course: validation.course, summary: validation.summary })
      } else if (intent === "patch") {
        const payload = params.get("ops")
        const courseId = new URLSearchParams(window.location.search).get("courseId")
        if (!courseId) return fail("Missing courseId")
        if (!payload) return fail("Missing ops payload")
        const decompressed = decompressFromEncodedURIComponent(payload)
        if (!decompressed) return fail("Could not decode operations")
        const parsed = JSON.parse(decompressed)
        const validation = validateOps(parsed)
        if (!validation.ok || !validation.ops) return fail(validation.summary)
        setResult({ status: "patch", ops: validation.ops, summary: validation.summary })
      }
    } catch {
      fail("Invalid deep link")
    } finally {
      window.location.hash = ""
    }
  }, [])

  return result
}
