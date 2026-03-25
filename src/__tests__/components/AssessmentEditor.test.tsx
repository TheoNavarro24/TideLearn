import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentEditor } from "@/components/assessment/AssessmentEditor";
import type { AssessmentLesson } from "@/types/course";

const LESSON: AssessmentLesson = {
  kind: "assessment",
  id: "lesson-1",
  title: "Test Assessment",
  questions: [
    {
      kind: "mcq",
      id: "q1",
      text: "What is the capital of France?",
      options: ["Berlin", "Paris", "Madrid", "Rome"],
      correctIndex: 1,
    },
  ],
  config: {
    passingScore: 80,
    examSize: 10,
  },
};

describe("AssessmentEditor AlertDialog delete flow", () => {
  it("clicking Delete button opens the AlertDialog with 'Delete question?' title", async () => {
    const user = userEvent.setup();
    render(<AssessmentEditor lesson={LESSON} onChange={vi.fn()} />);

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    expect(screen.getByText("Delete question?")).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone/i)
    ).toBeInTheDocument();
  });

  it("clicking Cancel in the dialog dismisses it without calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={LESSON} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText("Delete question?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("Delete question?")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking Delete confirm in the dialog calls onChange with the question removed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={LESSON} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText("Delete question?")).toBeInTheDocument();

    // Click the destructive Delete action button inside the dialog
    const buttons = screen.getAllByRole("button", { name: /delete/i });
    // The dialog action button is the last one (the card's Delete opens the dialog,
    // the AlertDialogAction is the confirmation Delete inside the dialog)
    const confirmBtn = buttons[buttons.length - 1];
    await user.click(confirmBtn);

    expect(onChange).toHaveBeenCalledOnce();
    const updatedLesson: AssessmentLesson = onChange.mock.calls[0][0];
    expect(updatedLesson.questions).toHaveLength(0);
  });
});
