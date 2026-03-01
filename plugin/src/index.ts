import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { ToolCallLoggerConfig } from "./types.js";
import { buildEnvelope } from "./envelope.js";
import { requestApproval } from "./gate.js";

const TAG = "[tool-call-logger]";
const APPROVAL_TIMEOUT_MS = 30_000;

export default function register(api: OpenClawPluginApi): void {
  const cfg = (api.pluginConfig ?? {}) as ToolCallLoggerConfig;
  const webhookUrl = cfg.webhookUrl ?? process.env["TOOL_CALL_WEBHOOK_URL"] ?? "";

  if (!webhookUrl) {
    console.error(
      `${TAG} no webhookUrl configured — all tool calls will be BLOCKED`,
    );
  } else {
    console.log(`${TAG} forwarding tool calls to ${webhookUrl}`);
  }

  api.on("before_tool_call", async (event) => {
    const envelope = buildEnvelope("before_tool_call", event);
    console.log(TAG, JSON.stringify(envelope, null, 2));

    if (!webhookUrl) {
      return { block: true, blockReason: "No approval webhook configured" };
    }

    const decision = await requestApproval(webhookUrl, envelope, APPROVAL_TIMEOUT_MS);

    if (!decision.approved) {
      console.warn(
        `${TAG} BLOCKED ${event.toolName}: ${decision.reason ?? "no reason"}`,
      );
      return { block: true, blockReason: decision.reason };
    }

    console.log(`${TAG} APPROVED ${event.toolName}`);
  });
}
