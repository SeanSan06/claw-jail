# Tool Call Logger — OpenClaw Plugin

A simple [OpenClaw](https://github.com/openclaw/openclaw) plugin that intercepts every agent tool call and prints it to the console. Useful for debugging, auditing, and understanding what the agent is doing in real time.

## What it does

| Hook | Behaviour |
|---|---|
| `before_tool_call` | Logs tool name, call ID, and parameter keys (or full params in verbose mode) |
| `after_tool_call` | Logs tool name, call ID, status (OK / ERR), and a result preview |

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

From /plugin:

```bash
docker build -t claw-jail-openclaw .
docker run --rm \
  -p 127.0.0.1:18789:18789 \
  --name claw-jail-openclaw \
  claw-jail-openclaw
```

Why `127.0.0.1:18789:18789`?

- It publishes the gateway to loopback only, so it is accessible from your host machine.
- It is not exposed on your LAN interfaces.

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
          "logResults": true,   // log after_tool_call events (default: true)
          "verbose": false      // full params + results in output (default: false)
        }
      }
    }
  }
}
```

## Example output

```
[tool-call-logger] ▶ CALL  tool=bash id=call_abc123 paramKeys=[command]
[tool-call-logger] ◀ OK    tool=bash id=call_abc123 preview={"content":[{"type":"text","text":"Hello world\n"}]}
```

With `verbose: true`:

```
[tool-call-logger] ▶ CALL  tool=bash id=call_abc123 params={
  "command": "echo Hello world"
}
[tool-call-logger] ◀ OK    tool=bash id=call_abc123 result={
  "content": [
    {
      "type": "text",
      "text": "Hello world\n"
    }
  ]
}
```