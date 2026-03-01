/**
 * Plugin configuration accepted via `openclaw.json` or environment variables.
 */
export type ToolCallLoggerConfig = {
  /** HTTP URL to POST tool-call event payloads to. */
  webhookUrl?: string;
};

/**
 * Envelope that wraps every logged / forwarded event.
 */
export interface Envelope {
  hook: string;
  timestamp: string;
  event: unknown;
}
