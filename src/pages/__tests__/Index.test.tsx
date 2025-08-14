import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "../Index";
import "@testing-library/jest-dom";

describe("Index page", () => {
  it("renders heading and navigation links", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: /Rapid E-learning Authoring Tool/i })
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Course Manager/i })).toHaveAttribute(
      "href",
      "/courses"
    );

    expect(screen.getByRole("link", { name: /Start authoring/i })).toHaveAttribute(
      "href",
      "/courses"
    );

    expect(screen.getByRole("link", { name: /See features/i })).toHaveAttribute(
      "href",
      "#features"
    );
  });
});
