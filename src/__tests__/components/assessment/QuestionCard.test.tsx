import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { QuestionCard } from "@/components/assessment/QuestionCard";
import { uid } from "@/types/course";

const q = {
  id: uid(),
  kind: "mcq" as const,
  text: "What is 2+2?",
  options: ["3", "4", "5", "6"] as [string, string, string, string],
  correctIndex: 1,
};

describe("QuestionCard", () => {
  test("renders question text and correct option", () => {
    render(<QuestionCard question={q} index={0} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText(/✓/)).toBeInTheDocument();
  });

  test("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<QuestionCard question={q} index={0} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("shows selected ring when selected=true", () => {
    const { container } = render(<QuestionCard question={q} index={0} selected onSelect={vi.fn()} />);
    expect(container.querySelector(".question-card")).toHaveAttribute("aria-pressed", "true");
  });

  test("renders no inline Edit or Delete buttons", () => {
    render(<QuestionCard question={q} index={0} selected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  test("renders kind label for non-MCQ question types", () => {
    const fillinblank = {
      id: uid(),
      kind: "fillinblank" as const,
      text: "Fill in the {{1}}",
      blanks: [{ id: uid(), acceptable: ["gap"], caseSensitive: false }],
      feedback: undefined,
    };
    render(<QuestionCard question={fillinblank} index={2} selected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
    expect(screen.getByText(/fillinblank/i)).toBeInTheDocument();
  });
});
