/**
 * Webhook test server with interactive approval gate.
 *
 * When a `before_tool_call` event arrives, the server prints the payload and
 * prompts you in the terminal to approve or reject it.  The plugin blocks
 * until this server responds.
 *
 * Usage:
 *   node test-server.mjs                  # listens on :4000
 *   PORT=9090 node test-server.mjs        # listens on :9090
 *   AUTO_APPROVE=1 node test-server.mjs   # skip prompts, approve everything
 *
 * Then configure the plugin:
 *   TOOL_CALL_WEBHOOK_URL=http://host.docker.internal:4000
 */

import { createServer } from "node:http";
import { createInterface } from "node:readline";

const PORT = parseInt(process.env.PORT || "4000", 10);

// ── Readline helper ──────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ── HTTP server ──────────────────────────────────────────────
const server = createServer((req, res) => {
  // Health-check / GET
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("tool-call-logger test server is running\n");
    return;
  }

  // Only accept POST
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed\n");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      console.log("\n── (non-JSON body) ──");
      console.log(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ approve: true }));
      return;
    }

    const hook = payload.hook ?? "unknown";
    const ts = payload.timestamp ?? "";
    const toolName = payload.event?.toolName ?? "unknown";

    console.log(`\n── ${hook} @ ${ts} ──`);
    console.log(JSON.stringify(payload, null, 2));

    // Only gate before_tool_call; everything else gets a simple ack.
    if (hook !== "before_tool_call") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // ── Approval gate ──────────────────────────────────────

    const answer = await ask(
      `\n⚡ Tool "${toolName}" wants to run. Approve? [Y/n] `,
    );

    const approved = !answer || /^y(es)?$/i.test(answer.trim());

    if (approved) {
      console.log(`  → ✅ approved`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ approve: true }));
    } else {
      const reason = `Operator rejected tool call "${toolName}"`;
      console.log(`  → ✋ blocked: ${reason}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ approve: false, reason }));
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🔌 Webhook test server listening on http://0.0.0.0:${PORT}`);
  console.log(`   Set TOOL_CALL_WEBHOOK_URL=http://host.docker.internal:${PORT}`);
});
