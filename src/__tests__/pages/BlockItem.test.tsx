import { render, screen, fireEvent } from "@testing-library/react";
import { BlockItem } from "@/pages/BlockItem";
import { getSpec } from "@/components/blocks/registry";
import { uid } from "@/types/course";

const headingBlock = { id: uid(), type: "heading" as const, text: "Hello" };
const spec = getSpec("heading");

test("renders View component (not editor form)", () => {
  render(<BlockItem block={headingBlock} spec={spec} selected={false} onSelect={vi.fn()} />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});

test("calls onSelect when clicked", () => {
  const onSelect = vi.fn();
  render(<BlockItem block={headingBlock} spec={spec} selected={false} onSelect={onSelect} />);
  fireEvent.click(screen.getByRole("button"));
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("has selected ring class when selected=true", () => {
  const { container } = render(<BlockItem block={headingBlock} spec={spec} selected onSelect={vi.fn()} />);
  const card = container.querySelector(".block-card");
  expect(card?.className).toContain("ring-2");
});
