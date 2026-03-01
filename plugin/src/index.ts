import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { ToolCallLoggerConfig } from "./types.js";
import { buildEnvelope } from "./envelope.js";
import { sendToWebhook } from "./webhook.js";
import { requestApproval } from "./gate.js";

const TAG = "[tool-call-logger]";

const APPROVAL_TIMEOUT_MS = 30_000;

/**
 * Plugin entry-point called by the OpenClaw runtime.
 *
 * Registers `before_tool_call` and `after_tool_call` hooks that:
 *   1. Log every event to the console.
 *   2. Optionally forward it to a webhook URL via HTTP POST.
 *   3. When `requireApproval` is enabled, **block** the tool call until the
 *      webhook responds with `{ "approve": true }`.
 */
export default function register(api: OpenClawPluginApi): void {
  const cfg = (api.pluginConfig ?? {}) as ToolCallLoggerConfig;
  const webhookUrl = cfg.webhookUrl ?? process.env["TOOL_CALL_WEBHOOK_URL"] ?? "";

  if (!webhookUrl) {
    console.warn(
      `${TAG} no webhookUrl configured — set plugins.entries.tool-call-logger.config.webhookUrl or TOOL_CALL_WEBHOOK_URL`,
    );
  } else {
    console.log(`${TAG} forwarding tool calls to ${webhookUrl}`);
  }

  if (!webhookUrl) {
    console.error(
      `${TAG} requireApproval is enabled but no webhookUrl is set — all tool calls will be BLOCKED`,
    );
  } else {
    console.log(
      `${TAG} approval gate enabled (timeout ${APPROVAL_TIMEOUT_MS} ms)`,
    );
  }

  // ── before_tool_call ────────────────────────────────────────
  api.on("before_tool_call", async (event) => {
    const envelope = buildEnvelope("before_tool_call", event);
    console.log(TAG, JSON.stringify(envelope, null, 2));

    // When approval is required, send and wait for a decision.
    if (!webhookUrl) {
      console.error(`${TAG} blocking ${event.toolName} — no webhookUrl`);
      return { block: true, blockReason: "No approval webhook configured" };
    }

    const decision = await requestApproval(webhookUrl, envelope, APPROVAL_TIMEOUT_MS);

    if (!decision.approved) {
      console.warn(
        `${TAG} ✋ BLOCKED ${event.toolName}: ${decision.reason ?? "no reason"}`,
      );
      return { block: true, blockReason: decision.reason };
    }

    console.log(`${TAG} ✅ APPROVED ${event.toolName}`);
  });

  // ── after_tool_call ─────────────────────────────────────────
  api.on("after_tool_call", async (event) => {
    const envelope = buildEnvelope("after_tool_call", event);
    console.log(TAG, JSON.stringify(envelope, null, 2));
    if (webhookUrl) await sendToWebhook(webhookUrl, envelope);
  });
}
