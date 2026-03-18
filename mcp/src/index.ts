import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerLessonTools } from "./tools/lessons.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerSemanticTools } from "./tools/semantic.js";
import { registerPreviewTools } from "./tools/preview.js";
import { registerMediaTools } from "./tools/media.js";

const server = new McpServer({
  name: "tidelearn",
  version: "1.0.0",
});

registerCourseTools(server);
registerLessonTools(server);
registerBlockTools(server);
registerSemanticTools(server);
registerPreviewTools(server);
registerMediaTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
