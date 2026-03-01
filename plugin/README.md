# Tool Call Logger — OpenClaw Plugin

A simple [OpenClaw](https://github.com/openclaw/openclaw) plugin that intercepts every agent tool call and forwards a JSON envelope to the console **and** (optionally) to an HTTP webhook. Useful for debugging, auditing, and understanding what the agent is doing in real time.

## What it does

| Hook | Behaviour |
|---|---|
| `before_tool_call` | Logs the full event payload before the tool executes |
| `after_tool_call` | Logs the full event payload (including result) after the tool executes |

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
│   └── webhook.ts      # HTTP webhook sender
├── test-server.mjs     # Standalone webhook test server
├── index.ts            # Re-export shim (backward compat)
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
          "webhookUrl": "http://localhost:4000"   // optional — HTTP endpoint to POST events to
        }
      }
    }
  }
}
```

The webhook URL can also be set via the `TOOL_CALL_WEBHOOK_URL` environment variable. If neither is set, events are logged to the console only.

## Development

```bash
npm install
npm run typecheck   # type-check without emitting
npm run build       # compile to dist/
```