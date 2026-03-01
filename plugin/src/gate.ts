import type { Envelope, WebhookApprovalResponse } from "./types.js";

const TAG = "[tool-call-logger]";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface GateDecision {
  approved: boolean;
  reason?: string;
}

/**
 * POST the envelope to the webhook and wait for an approval response.
 *
 * Behaviour:
 *  - On `{ "approve": true }`  → tool call proceeds.
 *  - On `{ "approve": false }` → tool call is blocked with optional reason.
 *  - On timeout / network error / non-2xx / malformed JSON → **blocked**
 *    (fail-closed) so a misbehaving webhook never silently approves calls.
 */
export async function requestApproval(
  url: string,
  envelope: Envelope,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<GateDecision> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(
        `${TAG} approval webhook responded ${res.status} ${res.statusText} — blocking tool call`,
      );
      return { approved: false, reason: `Webhook returned HTTP ${res.status}` };
    }

    const body = (await res.json()) as Partial<WebhookApprovalResponse>;

    if (body.approve === true) {
      return { approved: true };
    }

    return {
      approved: false,
      reason: body.reason ?? "Webhook did not approve the tool call",
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(
        `${TAG} approval webhook timed out after ${timeoutMs} ms — blocking tool call`,
      );
      return { approved: false, reason: `Approval timed out (${timeoutMs} ms)` };
    }
    console.error(`${TAG} approval webhook request failed — blocking tool call:`, err);
    return { approved: false, reason: "Approval webhook request failed" };
  } finally {
    clearTimeout(timer);
  }
}
