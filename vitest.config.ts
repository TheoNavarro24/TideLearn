import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
