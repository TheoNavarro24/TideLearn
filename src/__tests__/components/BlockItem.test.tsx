import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BlockItem } from "@/pages/BlockItem";
import { getSpec } from "@/components/blocks/registry";
import { factories } from "@/types/course";

describe("BlockItem a11y", () => {
  it("does not wrap an interactive view in a nested <button>", () => {
    const block = factories.flashcard();
    const spec = getSpec("flashcard");
    const { container } = render(
      <BlockItem block={block} spec={spec} selected={false} onSelect={() => {}} />
    );
    expect(container.querySelectorAll("button button").length).toBe(0);
  });

  it("fires onSelect on Enter and Space keydown", () => {
    const block = factories.text();
    const spec = getSpec("text");
    const onSelect = vi.fn();
    const { getByRole } = render(
      <BlockItem block={block} spec={spec} selected={false} onSelect={onSelect} />
    );
    const el = getByRole("button");
    fireEvent.keyDown(el, { key: "Enter" });
    fireEvent.keyDown(el, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
