import { useState } from "react";
import { SortingBlock } from "@/types/course";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm cursor-grab active:cursor-grabbing select-none">
      <span className="text-muted-foreground">⠿</span>{text}
    </div>
  );
}

export function SortingView({ block }: { block: SortingBlock }) {
  const newShuffle = () =>
    [...block.items].sort(() => Math.random() - 0.5).map((item) => item.id);

  const [order, setOrder] = useState<string[]>(() => newShuffle());
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((ids) => {
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        return arrayMove(ids, oldIndex, newIndex);
      });
    }
  };

  const isCorrect = order.every((id, i) =>
    block.items.find((it) => it.id === id)?.correctPosition === i
  );
  const itemMap = Object.fromEntries(block.items.map((item) => [item.id, item.text]));

  return (
    <div className="py-2 space-y-4">
      <p className="text-sm font-medium">{block.prompt}</p>
      {!submitted ? (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.map((id) => <SortableItem key={id} id={id} text={itemMap[id]} />)}
              </div>
            </SortableContext>
          </DndContext>
          <button onClick={() => setSubmitted(true)}
            className="rounded-md bg-[--color-teal-500] text-white px-4 py-2 text-sm font-medium hover:bg-[--color-teal-600]">
            Check order
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {order.map((id, i) => {
              const correct = block.items.find((it) => it.id === id)?.correctPosition === i;
              return (
                <div key={id} className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${correct ? "border-[--color-teal-500] bg-[--color-teal-500]/10" : "border-destructive bg-destructive/10"}`}>
                  <span>{correct ? "✓" : "✗"}</span>{itemMap[id]}
                </div>
              );
            })}
          </div>
          {block.showFeedback && (
            <p className="text-sm font-medium">{isCorrect ? "Correct order!" : "Not quite — see the correct order above."}</p>
          )}
          <button onClick={() => { setOrder(newShuffle()); setSubmitted(false); }} className="text-sm text-[--color-teal-500]">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
