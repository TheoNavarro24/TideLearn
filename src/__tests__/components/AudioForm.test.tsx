import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AudioForm } from "@/components/blocks/editor/AudioForm";
import type { AudioBlock } from "@/types/course";
import "react/jsx-runtime";

Object.defineProperty(window, "location", {
  value: { search: "?courseId=test" },
  writable: true,
});

vi.mock("@/components/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, session: null, loading: false, signOut: vi.fn() }),
}));

const BASE_AUDIO: AudioBlock = {
  id: "a1",
  type: "audio",
  src: "",
};

describe("AudioForm", () => {
  it("file input accept attribute includes audio/m4a", () => {
    render(<AudioForm block={BASE_AUDIO} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toContain("audio/m4a");
  });
});
