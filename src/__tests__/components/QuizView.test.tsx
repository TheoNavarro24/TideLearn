import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizView } from "@/components/blocks/view/Quiz";
import type { QuizBlock } from "@/types/course";

const QUIZ: QuizBlock = {
  id: "q1",
  type: "quiz",
  question: "What is 2 + 2?",
  options: ["3", "4", "5", "6"],
  correctIndex: 1,
  showFeedback: true,
  feedbackMessage: "Four is correct!",
};

describe("QuizView", () => {
  it("renders the question text", () => {
    render(<QuizView block={QUIZ} />);
    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
  });

  it("renders all 4 option buttons", () => {
    render(<QuizView block={QUIZ} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("Check button is disabled before selecting an option", () => {
    render(<QuizView block={QUIZ} />);
    const checkBtn = screen.getByRole("button", { name: /check/i });
    expect(checkBtn).toBeDisabled();
  });

  it("clicking an option enables the Check button", async () => {
    const user = userEvent.setup();
    render(<QuizView block={QUIZ} />);
    const checkBtn = screen.getByRole("button", { name: /check/i });
    expect(checkBtn).toBeDisabled();
    await user.click(screen.getByText("4"));
    expect(checkBtn).not.toBeDisabled();
  });

  it("correct answer shows 'Correct!' feedback", async () => {
    const user = userEvent.setup();
    render(<QuizView block={QUIZ} />);
    await user.click(screen.getByText("4")); // index 1 — correct
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
  });

  it("correct answer shows feedback message when showFeedback is true", async () => {
    const user = userEvent.setup();
    render(<QuizView block={QUIZ} />);
    await user.click(screen.getByText("4"));
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText("Four is correct!")).toBeInTheDocument();
  });

  it("incorrect answer shows 'Try again.' feedback", async () => {
    const user = userEvent.setup();
    render(<QuizView block={QUIZ} />);
    await user.click(screen.getByText("3")); // index 0 — incorrect
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText("Try again.")).toBeInTheDocument();
  });

  it("Reset clears selection and hides result", async () => {
    const user = userEvent.setup();
    render(<QuizView block={QUIZ} />);
    await user.click(screen.getByText("4"));
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.queryByText("Correct!")).not.toBeInTheDocument();
    // Check button should be disabled again after reset
    expect(screen.getByRole("button", { name: /check/i })).toBeDisabled();
  });

  it("correctIndex: -1 shows warning and Check is disabled", () => {
    const unsetQuiz: QuizBlock = { ...QUIZ, correctIndex: -1 };
    render(<QuizView block={unsetQuiz} />);
    expect(
      screen.getByText(/no correct answer has been set/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check/i })).toBeDisabled();
  });
});
