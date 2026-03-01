/**
 * Plugin configuration accepted via `openclaw.json` or environment variables.
 */
export type ToolCallLoggerConfig = {
  /** HTTP URL to POST tool-call event payloads to. */
  webhookUrl?: string;
  /**
   * When true, `before_tool_call` will POST the event to the webhook and
   * wait for an approval response before allowing the tool to execute.
   * If the webhook responds with `{ "approve": false }` (or times out),
   * the tool call is blocked.  Default: false.
   */
  requireApproval?: boolean;
  /**
   * Maximum milliseconds to wait for an approval response from the webhook.
   * If the timeout is reached the tool call is **blocked** (fail-closed).
   * Default: 30 000 (30 s).
   */
  approvalTimeoutMs?: number;
};

/**
 * Envelope that wraps every logged / forwarded event.
 */
export interface Envelope {
  hook: string;
  timestamp: string;
  event: unknown;
}

/**
 * Shape of the JSON body the webhook must return when `requireApproval`
 * is enabled.  Any extra fields are ignored.
 */
export interface WebhookApprovalResponse {
  /** `true` to allow the tool call, `false` (or missing) to block it. */
  approve: boolean;
  /** Optional reason surfaced to the agent when the call is blocked. */
  reason?: string;
}
