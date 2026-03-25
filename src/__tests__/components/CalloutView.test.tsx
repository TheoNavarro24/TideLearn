import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalloutView } from "@/components/blocks/view/Callout";
import type { CalloutBlock } from "@/types/course";

// Force JSX runtime
import "react/jsx-runtime";

const BASE_CALLOUT: CalloutBlock = {
  id: "c1",
  type: "callout",
  variant: "info",
  text: "<p>This is important information.</p>",
};

describe("CalloutView", () => {
  it("renders with role='note' ARIA attribute", () => {
    render(<CalloutView block={BASE_CALLOUT} />);
    const callout = screen.getByRole("note");
    expect(callout).toBeInTheDocument();
  });

  it("renders title text when provided", () => {
    const calloutWithTitle: CalloutBlock = {
      ...BASE_CALLOUT,
      title: "Important Note",
    };
    render(<CalloutView block={calloutWithTitle} />);
    expect(screen.getByText("Important Note")).toBeInTheDocument();
  });

  it("renders content HTML text", () => {
    render(<CalloutView block={BASE_CALLOUT} />);
    expect(screen.getByText("This is important information.")).toBeInTheDocument();
  });

  it("renders all callout variants without error", () => {
    const variants: Array<"info" | "success" | "warning" | "danger"> = [
      "info",
      "success",
      "warning",
      "danger",
    ];

    variants.forEach((variant) => {
      const { unmount } = render(
        <CalloutView block={{ ...BASE_CALLOUT, variant }} />
      );
      expect(screen.getByRole("note")).toBeInTheDocument();
      unmount();
    });
  });

  it("renders without crash when title is absent", () => {
    const calloutNoTitle: CalloutBlock = {
      ...BASE_CALLOUT,
      title: undefined,
    };
    render(<CalloutView block={calloutNoTitle} />);
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("This is important information.")).toBeInTheDocument();
  });

  it("sets aria-label from title when provided", () => {
    const calloutWithTitle: CalloutBlock = {
      ...BASE_CALLOUT,
      title: "Security Alert",
    };
    render(<CalloutView block={calloutWithTitle} />);
    const callout = screen.getByRole("note");
    expect(callout).toHaveAttribute("aria-label", "Security Alert");
  });

  it("sets aria-label to 'Callout' when title is absent", () => {
    const calloutNoTitle: CalloutBlock = {
      ...BASE_CALLOUT,
      title: undefined,
    };
    render(<CalloutView block={calloutNoTitle} />);
    const callout = screen.getByRole("note");
    expect(callout).toHaveAttribute("aria-label", "Callout");
  });
});
