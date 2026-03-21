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
    instructions: `TideLearn MCP — critical rules (read before calling any tool):
1. schemaVersion: 1 — every course_json passed to save_course MUST include schemaVersion: 1 at the top level.
2. HTML not markdown — text block "text" fields must be HTML (e.g. "<p>Hello</p>"), not markdown.
3. correctIndex — quiz blocks use correctIndex (number, 0-based), NOT correct_answer.
4. Omit id fields — never include id in blocks or lessons; ids are generated automatically.
5. Always call get_course before editing — never guess block_ids or lesson_ids.
6. Re-login on auth_required — call tidelearn_login again then retry.

Full block schema and tool reference: read the tidelearn://instructions resource.`,
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
