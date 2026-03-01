import type { Envelope } from "./types.js";

const TAG = "[tool-call-logger]";

/**
 * Fire-and-forget POST to the webhook URL.
 * Logs any network / HTTP errors to the console but never throws.
 */
export async function sendToWebhook(
  url: string,
  envelope: Envelope,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (!res.ok) {
      console.error(
        `${TAG} webhook responded ${res.status} ${res.statusText} for ${envelope.hook}`,
      );
    }
  } catch (err) {
    console.error(`${TAG} webhook POST failed:`, err);
  }
}
