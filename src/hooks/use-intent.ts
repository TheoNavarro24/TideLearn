import { useCallback } from "react";
import { validateOps, type PatchOp } from "@/lib/validate/ops";

export function useIntent(apply: (ops: PatchOp[]) => void) {
  return useCallback(
    (ops: PatchOp[]) => {
      validateOps(ops);
      apply(ops);
    },
    [apply]
  );
}
