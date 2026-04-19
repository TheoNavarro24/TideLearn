import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { AssessmentEditor } from "@/components/assessment/AssessmentEditor";
import { uid } from "@/types/course";

const lesson = {
  kind: "assessment" as const,
  id: uid(),
  title: "Quiz",
  config: { passingScore: 80, examSize: 20 },
  questions: [
    { id: uid(), kind: "mcq" as const, text: "Q1", options: ["a", "b", "c", "d"] as [string, string, string, string], correctIndex: 0 },
    { id: uid(), kind: "mcq" as const, text: "Q2", options: ["a", "b", "c", "d"] as [string, string, string, string], correctIndex: 0 },
  ],
};

describe("AssessmentEditor", () => {
  test("renders question cards", () => {
    render(<AssessmentEditor lesson={lesson} onChange={vi.fn()} />);
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Q2")).toBeInTheDocument();
  });

  test("clicking a question opens the inspector", () => {
    render(<AssessmentEditor lesson={lesson} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Question 1.*click to edit/i }));
    expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
  });

  test("no inline QuestionForm appears by default", () => {
    render(<AssessmentEditor lesson={lesson} onChange={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/enter your question/i)).not.toBeInTheDocument();
  });

  test("clicking + Add question opens inspector without persisting a draft", () => {
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={lesson} onChange={onChange} />);
    fireEvent.click(screen.getByText(/add question/i));
    // Draft is ephemeral — lesson is unchanged until user saves the inspector form.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
  });

  test("closing the inspector on a draft discards it (no empty question added)", () => {
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={lesson} onChange={onChange} />);
    fireEvent.click(screen.getByText(/add question/i));
    fireEvent.click(screen.getByLabelText(/close inspector/i));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
  });
});
