import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { QuestionInspector } from "@/components/assessment/QuestionInspector";
import { uid } from "@/types/course";

const q = {
  id: uid(),
  kind: "mcq" as const,
  text: "What?",
  options: ["a", "b", "c", "d"] as [string, string, string, string],
  correctIndex: 0,
};

function renderInspector(overrides = {}) {
  const props = {
    question: q,
    idx: 1,
    total: 3,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  return { ...render(<QuestionInspector {...props} />), props };
}

describe("QuestionInspector", () => {
  test("renders question kind label", () => {
    renderInspector();
    expect(screen.getByText(/mcq/i)).toBeInTheDocument();
  });

  test("close button calls onClose", () => {
    const { props } = renderInspector();
    fireEvent.click(screen.getByLabelText(/close inspector/i));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test("delete button calls onRemove with question id", () => {
    const { props } = renderInspector();
    fireEvent.click(screen.getByLabelText(/delete question/i));
    expect(props.onRemove).toHaveBeenCalledWith(q.id);
  });

  test("move up disabled when idx=0", () => {
    renderInspector({ idx: 0 });
    expect(screen.getByLabelText(/move question up/i)).toBeDisabled();
  });

  test("move down disabled at end", () => {
    renderInspector({ idx: 2, total: 3 });
    expect(screen.getByLabelText(/move question down/i)).toBeDisabled();
  });
});
