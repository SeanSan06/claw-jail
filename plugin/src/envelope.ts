import type { Envelope } from "./types.js";

/**
 * Wrap an OpenClaw hook event into the envelope the backend expects.
 *
 * OpenClaw's `PluginHookBeforeToolCallEvent` uses `params` for the tool
 * arguments, but the backend's Pydantic model calls them `input`.  We
 * normalise here so every downstream consumer sees a consistent shape.
 */
export function buildEnvelope(hook: string, event: unknown): Envelope {
  // Shallow-clone and rename `params` → `input` so the backend model parses correctly
  const raw = event as Record<string, unknown>;
  const normalised: Record<string, unknown> = { ...raw };
  if ("params" in normalised && !("input" in normalised)) {
    normalised.input = normalised.params;
    delete normalised.params;
  }

  return {
    hook,
    timestamp: new Date().toISOString(),
    event: normalised,
  };
}
