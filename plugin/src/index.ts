import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { ToolCallLoggerConfig } from "./types.js";
import { buildEnvelope } from "./envelope.js";
import { sendToWebhook } from "./webhook.js";

const TAG = "[tool-call-logger]";

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

  api.on("before_tool_call", async (event: unknown) => {
    const envelope = buildEnvelope("before_tool_call", event);
    console.log(TAG, JSON.stringify(envelope, null, 2));
    if (webhookUrl) await sendToWebhook(webhookUrl, envelope);
  });

  api.on("after_tool_call", async (event: unknown) => {
    const envelope = buildEnvelope("after_tool_call", event);
    console.log(TAG, JSON.stringify(envelope, null, 2));
    if (webhookUrl) await sendToWebhook(webhookUrl, envelope);
  });
}
