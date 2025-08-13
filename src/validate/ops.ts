import { z } from "zod"

const opSchema = z.unknown()
const opsSchema = z.array(opSchema)

export function validateOps(data: unknown): { ok: boolean; ops?: unknown[]; summary: string } {
  const parsed = opsSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, summary: parsed.error.errors.map(e => e.message).join("; ") }
  }
  return { ok: true, ops: parsed.data, summary: `${parsed.data.length} operations` }
}
