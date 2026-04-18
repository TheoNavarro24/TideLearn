import { render, screen, fireEvent } from "@testing-library/react";
import { BlockInspector } from "@/pages/BlockInspector";
import { getSpec } from "@/components/blocks/registry";
import { uid } from "@/types/course";

const block = { id: uid(), type: "text" as const, text: "Hello" };
const spec = getSpec("text");

function renderInspector(overrides = {}) {
  const props = {
    block, spec,
    idx: 1, total: 3,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  return { ...render(<BlockInspector {...props} />), props };
}

test("renders block type label", () => {
  renderInspector();
  // "Text" label appears in the header; TextForm also renders "Text" FieldLabel
  expect(screen.getAllByText(/^text$/i).length).toBeGreaterThan(0);
});

test("close button calls onClose", () => {
  const { props } = renderInspector();
  fireEvent.click(screen.getByLabelText(/close inspector/i));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("delete button calls onRemove with block id", () => {
  const { props } = renderInspector();
  fireEvent.click(screen.getByLabelText(/delete block/i));
  expect(props.onRemove).toHaveBeenCalledWith(block.id);
});

test("duplicate button calls onDuplicate", () => {
  const { props } = renderInspector();
  fireEvent.click(screen.getByLabelText(/duplicate block/i));
  expect(props.onDuplicate).toHaveBeenCalledWith(block.id);
});

test("move up disabled when idx=0", () => {
  renderInspector({ idx: 0 });
  expect(screen.getByLabelText(/move block up/i)).toBeDisabled();
});

test("move down disabled when idx=total-1", () => {
  renderInspector({ idx: 2, total: 3 });
  expect(screen.getByLabelText(/move block down/i)).toBeDisabled();
});
