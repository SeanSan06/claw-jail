# Tool Call Logger — OpenClaw Plugin

A simple [OpenClaw](https://github.com/openclaw/openclaw) plugin that intercepts every agent tool call and forwards a JSON envelope to the console **and** (optionally) to an HTTP webhook. Useful for debugging, auditing, and understanding what the agent is doing in real time.

## What it does

| Hook | Behaviour |
|---|---|
| `before_tool_call` | Logs the full event payload before the tool executes. When `requireApproval` is enabled, **blocks** until the webhook responds with `{ "approve": true }`. |

Each event is wrapped in an envelope:

```json
{
  "hook": "before_tool_call",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "event": { "...original event from OpenClaw..." }
}
```

## Project structure

```
plugin/
├── src/
│   ├── index.ts        # Plugin entry-point (register function)
│   ├── types.ts        # Shared TypeScript types
│   ├── envelope.ts     # Envelope builder
│   └── gate.ts         # Approval gate (blocks until webhook responds)
├── test-server.mjs     # Interactive webhook test server with approval prompts
├── openclaw.plugin.json
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Install

### From this directory (dev / link mode)

```bash
openclaw plugins install -l .
```

### Copy install

```bash
openclaw plugins install .
```

Then restart the Gateway.

## Docker (OpenClaw + this plugin)

From `/plugin`:

```bash
docker build -t claw-jail-openclaw .
docker run --rm \
  -p 127.0.0.1:18789:18789 \
  --name claw-jail-openclaw \
  claw-jail-openclaw
```

Why `127.0.0.1:18789:18789`?

- Publishes the gateway to loopback only — accessible from your host but not your LAN.

Gateway URL from your host:

- `http://127.0.0.1:18789/openclaw`

## Configuration

Add to `~/.openclaw/openclaw.json`:

```jsonc
{
  "plugins": {
    "entries": {
      "tool-call-logger": {
        "enabled": true,
        "config": {
          "webhookUrl": "http://localhost:4000"
        }
      }
    }
  }
}
```

The webhook URL can also be set via the `TOOL_CALL_WEBHOOK_URL` environment variable. If neither is set, all tool calls will be blocked.

## Approval gate

Every `before_tool_call` event is sent to the webhook and the plugin **blocks execution** until it receives a JSON response:

### Approve

```json
{ "approve": true }
```

### Reject

```json
{ "approve": false, "reason": "Operator rejected tool call" }
```

If the webhook times out, returns a non-2xx status, or sends malformed JSON, the tool call is **blocked** (fail-closed).

This lets you build human-in-the-loop approval workflows — the included `test-server.mjs` provides an interactive terminal prompt for this out of the box.

## Testing with the webhook test server

A Node.js HTTP server is included that receives tool-call events and lets you approve or reject them interactively from your terminal.

### 1. Start the test server

```bash
# Interactive mode (default) — prompts you for each tool call
node test-server.mjs

# Auto-approve mode — approves everything without prompting
AUTO_APPROVE=1 node test-server.mjs

# Custom port
PORT=9090 node test-server.mjs
```

Or via npm:

```bash
npm run test-server
```

### 2. Point the plugin at the test server

```bash
export TOOL_CALL_WEBHOOK_URL=http://host.docker.internal:4000
```

Or set `webhookUrl` in `openclaw.json` (see Configuration above).

> When running the plugin in Docker and the test server on your host, use
> `http://host.docker.internal:4000` — not `localhost`.

### 3. Trigger a tool call

Use the OpenClaw gateway as normal. In interactive mode, each `before_tool_call` will pause and prompt:

```
── before_tool_call @ 2026-02-28T12:00:00.000Z ──
{ "hook": "before_tool_call", ... }

⚡ Tool "bash" wants to run. Approve? [Y/n]
```

Press **Enter** (or `y`) to approve, or type `n` to block the call.

### 4. Verify connectivity (optional)

```bash
# Health check
curl http://localhost:4000

# Send a test payload
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{"hook":"before_tool_call","timestamp":"now","event":{"toolName":"bash","params":{"command":"echo hi"}}}'
```

## Development

```bash
npm install
npm run typecheck   # type-check without emitting
npm run build       # compile to dist/
```