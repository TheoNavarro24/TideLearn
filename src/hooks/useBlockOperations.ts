import { Block, BlockType, ContentLesson, Lesson, uid } from "@/types/course";
import { createBlock } from "@/components/blocks/registry";

interface EditorState {
  courseTitle: string;
  lessons: Lesson[];
}

export function useBlockOperations(
  selectedLesson: ContentLesson | null,
  courseTitle: string,
  lessons: Lesson[],
  pushHistory: (state: EditorState) => void,
) {
  const addBlock = (type: BlockType) => {
    if (!selectedLesson) return;
    const block = createBlock(type);
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === selectedLesson.id ? { ...l, blocks: [...l.blocks, block] } : l) });
  };

  const updateBlock = (blockId: string, updater: (b: Block) => Block) => {
    if (!selectedLesson) return;
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.map(b => b.id === blockId ? updater(b) : b) } : l) });
  };

  const removeBlock = (blockId: string) => {
    if (!selectedLesson) return;
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.filter(b => b.id !== blockId) } : l) });
  };

  const insertBlockAt = (index: number, type: BlockType) => {
    if (!selectedLesson) return;
    const block = createBlock(type);
    pushHistory({ courseTitle, lessons: lessons.map(l =>
      l.id === selectedLesson.id
        ? { ...l, blocks: [...l.blocks.slice(0, index), block, ...l.blocks.slice(index)] }
        : l
    ) });
  };

  const moveBlock = (blockId: string, dir: "up" | "down") => {
    if (!selectedLesson) return;
    pushHistory({ courseTitle, lessons: lessons.map(l => {
      if (l.id !== selectedLesson.id) return l;
      const idx = l.blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return l;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= l.blocks.length) return l;
      const blocks = [...l.blocks];
      const [item] = blocks.splice(idx, 1);
      blocks.splice(newIdx, 0, item);
      return { ...l, blocks };
    }) });
  };

  const duplicateBlock = (blockId: string) => {
    if (!selectedLesson) return;
    pushHistory({ courseTitle, lessons: lessons.map(l => {
      if (l.id !== selectedLesson.id) return l;
      const idx = l.blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return l;
      const copy = { ...(l.blocks[idx] as any), id: uid() } as Block;
      const blocks = [...l.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { ...l, blocks };
    }) });
  };

  return { addBlock, updateBlock, removeBlock, insertBlockAt, moveBlock, duplicateBlock };
}
