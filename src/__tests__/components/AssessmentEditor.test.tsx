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
  it("clicking Delete button in inspector opens the AlertDialog with 'Delete question?' title", async () => {
    const user = userEvent.setup();
    render(<AssessmentEditor lesson={LESSON} onChange={vi.fn()} />);

    // Open inspector by clicking the question card
    await user.click(screen.getByRole("button", { name: /Question 1.*click to edit/i }));

    // Click the trash/Delete button in the inspector footer
    const deleteBtn = screen.getByRole("button", { name: /delete question/i });
    await user.click(deleteBtn);

    expect(screen.getByText("Delete question?")).toBeInTheDocument();
    expect(
      screen.getByText(/This cannot be undone/i)
    ).toBeInTheDocument();
  });

  it("clicking Cancel in the dialog dismisses it without calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={LESSON} onChange={onChange} />);

    // Open inspector
    await user.click(screen.getByRole("button", { name: /Question 1.*click to edit/i }));
    await user.click(screen.getByRole("button", { name: /delete question/i }));
    expect(screen.getByText("Delete question?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("Delete question?")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking Delete confirm in the dialog calls onChange with the question removed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={LESSON} onChange={onChange} />);

    // Open inspector
    await user.click(screen.getByRole("button", { name: /Question 1.*click to edit/i }));
    await user.click(screen.getByRole("button", { name: /delete question/i }));
    expect(screen.getByText("Delete question?")).toBeInTheDocument();

    // Click the destructive Delete action button inside the dialog
    const buttons = screen.getAllByRole("button", { name: /delete/i });
    // The AlertDialogAction is the last "delete" button (after the inspector's trash)
    const confirmBtn = buttons[buttons.length - 1];
    await user.click(confirmBtn);

    expect(onChange).toHaveBeenCalledOnce();
    const updatedLesson: AssessmentLesson = onChange.mock.calls[0][0];
    expect(updatedLesson.questions).toHaveLength(0);
  });
});
