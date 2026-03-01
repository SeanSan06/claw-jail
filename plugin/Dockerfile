FROM node:22-bookworm-slim

ENV HOME=/home/openclaw
ENV OPENCLAW_PORT=18789
ENV OPENCLAW_MODEL=openrouter/stepfun/step-3.5-flash:free

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10001 -s /bin/sh openclaw

RUN npm install -g --no-audit --no-fund --fetch-retries=5 --fetch-timeout=300000 \
      openclaw@latest \
  && npm cache clean --force

COPY --chown=openclaw:openclaw index.ts openclaw.plugin.json package.json \
     /opt/openclaw-plugin/

# Pre-create the data dir so Docker copies ownership to fresh named volumes
RUN mkdir -p /home/openclaw/.openclaw/workspace \
  && chown -R openclaw:openclaw /home/openclaw/.openclaw

COPY --chmod=755 <<'SCRIPT' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -eu

DATA="$HOME/.openclaw"
CONFIG="$DATA/openclaw.json"
PLUGIN_ID="tool-call-logger"

mkdir -p "$DATA/workspace"

# ── Configure via CLI on first run ───────────────────────────
if [ ! -f "$CONFIG" ]; then
  echo ">>> configuring openclaw"
  openclaw config set gateway.mode        local
  openclaw config set gateway.port        "$OPENCLAW_PORT"   --strict-json
  openclaw config set gateway.bind        loopback
  openclaw config set gateway.auth.mode   token
  openclaw config set gateway.auth.token  "${OPENCLAW_GATEWAY_TOKEN:-openclaw-docker}"

  openclaw config set gateway.controlUi.enabled true --strict-json
  openclaw config set gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback true --strict-json
  openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true --strict-json
  openclaw config set gateway.controlUi.allowInsecureAuth true --strict-json

  openclaw config set env.OPENROUTER_API_KEY "${OPENROUTER_API_KEY:-}"

  openclaw config set agents.defaults.model     "$OPENCLAW_MODEL"
  openclaw config set agents.defaults.workspace "$DATA/workspace"
fi

# ── Install plugin (also registers its config entry) ─────────
if [ ! -d "$DATA/extensions/$PLUGIN_ID" ]; then
  echo ">>> installing plugin $PLUGIN_ID"
  openclaw plugins install /opt/openclaw-plugin
  # Fix install hint: unset npm-name entry, set manifest-id entry
  openclaw config unset plugins.entries.openclaw-tool-call-logger 2>/dev/null || true
  openclaw config set plugins.entries.${PLUGIN_ID}.enabled         true  --strict-json
  openclaw config set plugins.entries.${PLUGIN_ID}.config.logResults true  --strict-json
  openclaw config set plugins.entries.${PLUGIN_ID}.config.verbose   false --strict-json
fi

# ── Launch ───────────────────────────────────────────────────
TOKEN="${OPENCLAW_GATEWAY_TOKEN:-openclaw-docker}"
echo ">>> openclaw gateway :${OPENCLAW_PORT}"
exec openclaw gateway --port "$OPENCLAW_PORT" --bind lan --token "$TOKEN" --verbose
SCRIPT

USER openclaw
WORKDIR /home/openclaw
EXPOSE ${OPENCLAW_PORT}
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
