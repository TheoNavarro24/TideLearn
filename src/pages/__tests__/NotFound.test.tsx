import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "../NotFound";
import "@testing-library/jest-dom";
import { vi } from "vitest";

describe("NotFound page", () => {
  it("logs error and displays 404 message with home link", () => {
    const path = "/some/random";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={[path]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(
      screen.getByText(/Oops! Page not found/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Home/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      path
    );

    errorSpy.mockRestore();
  });
});
