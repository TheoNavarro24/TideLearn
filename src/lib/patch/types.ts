import type { Block, Lesson } from "@/types/course";

export type UpsertLesson = { type: "upsertLesson"; lesson: Lesson };
export type AppendBlocks = { type: "appendBlocks"; lessonId: string; blocks: Block[] };
export type UpdateBlock = { type: "updateBlock"; lessonId: string; block: Block };
export type RemoveBlock = { type: "removeBlock"; lessonId: string; blockId: string };

export type PatchOp = UpsertLesson | AppendBlocks | UpdateBlock | RemoveBlock;

export type Patch = { ops: PatchOp[] };
