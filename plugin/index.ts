import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

type ToolCallLoggerConfig = {
  logResults?: boolean;
  verbose?: boolean;
};

export default function register(api: OpenClawPluginApi) {
  const cfg = (api.pluginConfig ?? {}) as ToolCallLoggerConfig;
  const logResults = cfg.logResults !== false;
  const verbose = cfg.verbose === true;

  const TAG = "[tool-call-logger]";

  api.on("before_tool_call", async (event: any) => {
    const toolName = event.toolName ?? event.name ?? "unknown";
    const toolCallId = event.toolCallId ?? event.id ?? "";

    if (verbose) {
      console.log(
        `${TAG} ▶ CALL  tool=${toolName} id=${toolCallId} params=${JSON.stringify(event.params ?? event.input ?? {}, null, 2)}`,
      );
    } else {
      const paramKeys = Object.keys(event.params ?? event.input ?? {});
      console.log(
        `${TAG} ▶ CALL  tool=${toolName} id=${toolCallId} paramKeys=[${paramKeys.join(", ")}]`,
      );
    }
  });

  if (logResults) {
    api.on("after_tool_call", async (event: any) => {
      const toolName = event.toolName ?? event.name ?? "unknown";
      const toolCallId = event.toolCallId ?? event.id ?? "";
      const isError = event.isError === true;
      const status = isError ? "ERR" : "OK";

      if (verbose) {
        const resultText =
          typeof event.result === "string"
            ? event.result
            : JSON.stringify(event.result ?? event.output ?? "", null, 2);
        console.log(
          `${TAG} ◀ ${status}  tool=${toolName} id=${toolCallId} result=${resultText}`,
        );
      } else {
        const preview = truncate(
          typeof event.result === "string"
            ? event.result
            : JSON.stringify(event.result ?? event.output ?? ""),
          120,
        );
        console.log(
          `${TAG} ◀ ${status}  tool=${toolName} id=${toolCallId} preview=${preview}`,
        );
      }
    });
  }
}

/** Truncate a string to `max` characters, appending "…" if trimmed. */
function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
