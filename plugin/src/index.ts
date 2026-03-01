import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { ToolCallLoggerConfig } from "./types.js";
import { buildEnvelope } from "./envelope.js";
import { requestApproval } from "./gate.js";

const TAG = "[tool-call-logger]";
const APPROVAL_TIMEOUT_MS = 120_000;
const DEDUP_WINDOW_MS = 5_000;

// Dedup: hash → { timestamp, pending promise, resolved decision }
const recentCalls = new Map<
  string,
  {
    ts: number;
    pending: Promise<{ approved: boolean; reason?: string }> | null;
    decision: { approved: boolean; reason?: string } | null;
  }
>();

function callHash(toolName: string, input: unknown): string {
  return `${toolName}:${JSON.stringify(input ?? {})}`;
}

function pruneStale(): void {
  const now = Date.now();
  for (const [key, entry] of recentCalls) {
    if (now - entry.ts > DEDUP_WINDOW_MS && !entry.pending) {
      recentCalls.delete(key);
    }
  }
}

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

    // --- Deduplication ---
    pruneStale();
    // OpenClaw SDK uses `params`, not `input`
    const hash = callHash(event.toolName, (event as Record<string, unknown>).params);
    const existing = recentCalls.get(hash);

    if (existing) {
      // If the previous identical call is still awaiting approval, reuse its promise
      if (existing.pending) {
        console.log(`${TAG} duplicate (pending) — reusing in-flight request for ${event.toolName}`);
        const decision = await existing.pending;
        if (!decision.approved) {
          return { block: true, blockReason: decision.reason };
        }
        return;
      }
      // Otherwise it resolved recently — replay the same decision
      if (Date.now() - existing.ts < DEDUP_WINDOW_MS && existing.decision) {
        console.log(`${TAG} duplicate (recent) — replaying previous decision for ${event.toolName}`);
        if (!existing.decision.approved) {
          return { block: true, blockReason: existing.decision.reason };
        }
        return;
      }
    }

    const approvalPromise = requestApproval(webhookUrl, envelope, APPROVAL_TIMEOUT_MS);
    recentCalls.set(hash, { ts: Date.now(), pending: approvalPromise, decision: null });

    const decision = await approvalPromise;
    // Mark resolved: store the decision for replay
    recentCalls.set(hash, { ts: Date.now(), pending: null, decision });

    if (!decision.approved) {
      console.warn(
        `${TAG} BLOCKED ${event.toolName}: ${decision.reason ?? "no reason"}`,
      );
      return { block: true, blockReason: decision.reason };
    }

    console.log(`${TAG} APPROVED ${event.toolName}`);
  });
}
