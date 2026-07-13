/**
 * Regression test: ephemeral per-turn attachments (task_reminder,
 * deferred_tools_delta, …) must NOT be replayed into API context. CC
 * regenerates them fresh each turn; replaying every stored copy inflated a
 * single window past the model's context limit. See normalize.ts
 * NULL_RENDERING_ATTACHMENT_TYPES. No corpus needed — synthetic input.
 */

import { normalizeMessages } from "../src/normalize.js";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

const att = (type: string, attachment: any): any => ({
  type: "attachment",
  uuid: `att-${type}`,
  timestamp: "2026-07-13T00:00:00.000Z",
  message: { role: "user", content: [] },
  attachment: { type, ...attachment },
});

console.log("\n--- Ephemeral attachments dropped ---");
{
  const chain = [
    att("task_reminder", { content: [{ id: "1", status: "pending", subject: "SECRET_TASK_MARKER" }] }),
    att("deferred_tools_delta", { addedNames: ["DEFERRED_MARKER"] }),
    att("todo_reminder", { content: [{ status: "pending", text: "TODO_MARKER" }] }),
    att("team_context", { note: "TEAM_MARKER" }),
    att("token_usage", { total: 12345 }),
  ];
  const blob = JSON.stringify(normalizeMessages(chain));
  assert(!blob.includes("SECRET_TASK_MARKER"), "task_reminder dropped");
  assert(!blob.includes("DEFERRED_MARKER"), "deferred_tools_delta dropped");
  assert(!blob.includes("TODO_MARKER"), "todo_reminder dropped");
  assert(!blob.includes("TEAM_MARKER"), "team_context dropped");
  assert(!blob.includes("12345"), "token_usage dropped");
}

console.log("\n--- Content-bearing attachments preserved ---");
{
  const chain = [
    att("file", { content: "IMPORTANT_FILE_BODY", filename: "a.txt" }),
    att("directory", { path: "/x", content: "LS_OUTPUT_BODY" }),
  ];
  const blob = JSON.stringify(normalizeMessages(chain));
  assert(blob.includes("IMPORTANT_FILE_BODY"), "file attachment preserved");
  assert(blob.includes("LS_OUTPUT_BODY"), "directory attachment preserved");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("✅ attachment-drop tests passed");
