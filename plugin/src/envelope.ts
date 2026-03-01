import type { Envelope } from "./types.js";

export function buildEnvelope(hook: string, event: unknown): Envelope {
  return {
    hook,
    timestamp: new Date().toISOString(),
    event,
  };
}
