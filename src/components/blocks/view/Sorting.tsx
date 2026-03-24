import { useState } from "react";
import { SortingBlock } from "@/types/course";
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  rectIntersection, DragOverlay,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function DraggableCard({
  id, text, feedback, isGhost,
}: {
  id: string; text: string;
  feedback?: "correct" | "incorrect" | null;
  isGhost?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const borderClass =
    feedback === "correct" ? "border-[var(--accent-hex)] bg-[var(--accent-hex)]/10 text-[var(--accent-hex)]" :
    feedback === "incorrect" ? "border-destructive bg-destructive/10 text-destructive" :
    "border-border bg-card";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging || isGhost ? 0.35 : 1 }}
      {...attributes} {...listeners}
      className={`rounded-md border px-3 py-2 text-sm cursor-grab active:cursor-grabbing select-none transition-opacity ${borderClass}`}>
      {feedback === "correct" && <span className="mr-1.5">✓</span>}
      {feedback === "incorrect" && <span className="mr-1.5">✗</span>}
      {text}
    </div>
  );
}

function DroppableZone({
  id, label, children, isOver, isEmpty,
}: {
  id: string; label?: string; children: React.ReactNode;
  isOver: boolean; isEmpty?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 p-3 transition-colors min-h-[80px] ${
        isOver
          ? "border-[var(--accent-hex)] bg-[var(--accent-hex)]/5"
          : "border-dashed border-border"
      }`}>
      {label && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      )}
      {isEmpty && !isOver && !label && (
        <p className="text-xs text-muted-foreground text-center pt-2">Drag items here</p>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function SortingView({ block }: { block: SortingBlock }) {
  const [placement, setPlacement] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(block.items.map(item => [item.id, null]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? (event.over.id as string) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setOverId(null);
    setActiveId(null);
    if (!over) return;
    const target = over.id as string;
    setPlacement(prev => ({
      ...prev,
      [active.id as string]: target === "pool" ? null : target,
    }));
  };

  const allPlaced = Object.values(placement).every(v => v !== null);
  const itemMap = Object.fromEntries(block.items.map(i => [i.id, i]));
  const poolItems = block.items.filter(item => placement[item.id] === null);

  const score = submitted
    ? block.items.filter(item => placement[item.id] === item.bucketId).length
    : 0;

  return (
    <div className="py-2 space-y-4">
      <p className="text-sm font-medium">{block.prompt}</p>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setOverId(null); setActiveId(null); }}>

        {/* Unplaced items pool */}
        <DroppableZone id="pool" isOver={overId === "pool"} isEmpty={poolItems.length === 0}>
          {poolItems.map(item => (
            <DraggableCard key={item.id} id={item.id} text={item.text} isGhost={item.id === activeId} />
          ))}
          {poolItems.length === 0 && (
            <p className="text-xs text-muted-foreground w-full text-center py-1">
              {submitted ? "All items sorted" : "All items placed — submit or drag back to adjust"}
            </p>
          )}
        </DroppableZone>

        {/* Bucket columns */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.buckets.length}, 1fr)` }}>
          {block.buckets.map(bucket => {
            const bucketItems = block.items.filter(item => placement[item.id] === bucket.id);
            return (
              <DroppableZone
                key={bucket.id} id={bucket.id} label={bucket.label}
                isOver={overId === bucket.id} isEmpty={bucketItems.length === 0}>
                {bucketItems.map(item => {
                  const feedback = submitted
                    ? (item.bucketId === bucket.id ? "correct" : "incorrect")
                    : null;
                  return (
                    <DraggableCard
                      key={item.id} id={item.id} text={item.text}
                      feedback={feedback} isGhost={item.id === activeId} />
                  );
                })}
              </DroppableZone>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="rounded-md border border-[var(--accent-hex)] bg-card px-3 py-2 text-sm shadow-lg cursor-grabbing select-none">
              {itemMap[activeId]?.text}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allPlaced}
          className="rounded-md bg-[var(--accent-hex)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hex)] disabled:opacity-40 disabled:cursor-not-allowed">
          Check answers
        </button>
      ) : (
        <div className="space-y-2">
          {block.showFeedback && (
            <p className="text-sm font-medium">
              {score === block.items.length
                ? "All correct!"
                : `${score} of ${block.items.length} correct — items in the wrong bucket are highlighted.`}
            </p>
          )}
          <button
            onClick={() => {
              setPlacement(Object.fromEntries(block.items.map(i => [i.id, null])));
              setSubmitted(false);
            }}
            className="text-sm text-[var(--accent-hex)] hover:text-[var(--accent-hex)]">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
