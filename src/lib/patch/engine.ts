export type Path = Array<string | number>;

export type PatchOp =
  | { op: 'add'; path: Path; value: unknown }
  | { op: 'remove'; path: Path }
  | { op: 'replace'; path: Path; value: unknown };
function resolveParent(target: unknown, path: Path) {
  if (path.length === 0) throw new Error('empty path');
  let obj: any = target as any;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    obj = obj[key as any];
    if (obj === undefined) throw new Error('invalid path');
  }
  return { parent: obj, key: path[path.length - 1] };
}

function applyOne(target: unknown, op: PatchOp) {
  const { parent, key } = resolveParent(target, op.path);
  switch (op.op) {
    case 'add': {
      if (Array.isArray(parent)) {
        if (typeof key !== 'number' || key < 0 || key > parent.length) throw new Error('invalid index');
        parent.splice(key, 0, op.value);
      } else {
        (parent as any)[key] = op.value;
      }
      break;
    }
    case 'remove': {
      if (Array.isArray(parent)) {
        if (typeof key !== 'number' || key < 0 || key >= parent.length) throw new Error('invalid index');
        parent.splice(key, 1);
      } else {
        if (!Object.prototype.hasOwnProperty.call(parent, key)) throw new Error('missing key');
        delete (parent as any)[key];
      }
      break;
    }
    case 'replace': {
      if (Array.isArray(parent)) {
        if (typeof key !== 'number' || key < 0 || key >= parent.length) throw new Error('invalid index');
        parent[key] = op.value;
      } else {
        if (!Object.prototype.hasOwnProperty.call(parent, key)) throw new Error('missing key');
        (parent as any)[key] = op.value;
      }
      break;
    }
    default:
      // Exhaustiveness check
      const _never: never = op;
      throw new Error('Unknown op ' + (_never as any));
  }
}

/**
 * Apply an array of patch operations. If any operation fails,
 * the original object is returned and `ok` is false.
 */
export function applyPatch<T>(source: T, ops: PatchOp[]): { ok: true; value: T } | { ok: false; value: T } {
  const working: T = structuredClone(source);
  try {
    for (const op of ops) applyOne(working, op);
    return { ok: true, value: working };
  } catch {
    return { ok: false, value: source };
  }
}
