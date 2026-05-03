#!/bin/bash
# Pre-deploy safety check: block if Quad bot has an active recording.
# Used as a Claude Code hook on Bash commands that deploy to Unraid.

# Only check commands that deploy/disrupt the quad container.
# Triggers on docker compose ops in /mnt/user/appdata/quad targeting unraid.
if ! echo "$CLAUDE_TOOL_INPUT" | grep -q 'unraid'; then
    exit 0
fi
if ! echo "$CLAUDE_TOOL_INPUT" | grep -q 'mnt/user/appdata/quad'; then
    exit 0
fi
if ! echo "$CLAUDE_TOOL_INPUT" | grep -qE 'docker compose.*(up|down|restart|stop|kill|recreate|rm)'; then
    exit 0
fi

health=$(ssh unraid 'curl -s http://localhost:3000/health' 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "WARNING: Could not reach Quad health endpoint. Proceed with caution." >&2
    exit 0
fi

if echo "$health" | grep -q '"active":true'; then
    echo "BLOCKED: Active recording in progress. Do not deploy until the recording session ends." >&2
    echo "$health" | python3 -m json.tool >&2 2>/dev/null || echo "$health" >&2
    exit 1
fi

echo "Safety check passed: no active recordings." >&2
exit 0
