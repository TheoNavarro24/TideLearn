import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerLessonTools } from "./tools/lessons.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerSemanticTools } from "./tools/semantic.js";
import { registerPreviewTools } from "./tools/preview.js";
import { registerMediaTools } from "./tools/media.js";
import { registerAssessmentTools } from "./tools/assessment.js";
import { registerInstructionsResource } from "./resources/instructions.js";

const server = new McpServer(
  { name: "tidelearn", version: "1.0.0" },
  {
    instructions: `TideLearn MCP — course authoring tools for eLearning professionals.

Critical: read the tidelearn://instructions resource before calling any other tools. It contains the complete block schema, tool reference, workflows, and rules.

Quick reminders:
1. schemaVersion: 1 required in all course_json.
2. Content lessons need kind: "content"; assessment lessons need kind: "assessment".
3. Text fields accept HTML or markdown (callout text: use HTML).
4. quiz blocks use correctIndex (number, 0-based).
5. Omit id fields — generated automatically.
6. Always call get_course before editing to get current ids.`,
  }
);

registerInstructionsResource(server);
registerAuthTools(server);
registerCourseTools(server);
registerLessonTools(server);
registerBlockTools(server);
registerSemanticTools(server);
registerPreviewTools(server);
registerMediaTools(server);
registerAssessmentTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
