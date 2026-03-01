import type { Envelope } from "./types.js";

/**
 * Build the full envelope that is both logged to the console and POSTed
 * to the configured webhook URL.
 */
export function buildEnvelope(hook: string, event: unknown): Envelope {
  return {
    hook,
    timestamp: new Date().toISOString(),
    event,
  };
}
