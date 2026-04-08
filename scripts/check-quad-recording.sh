#!/bin/bash
# Pre-deploy safety check: block if Quad bot has an active recording.
# Used as a Claude Code hook on Bash commands that deploy to pinnaclepowerhouse.

# Only check commands that deploy (pull/up/restart/rebuild)
if ! echo "$CLAUDE_TOOL_INPUT" | grep -q 'pinnaclepowerhouse'; then
    exit 0
fi
if ! echo "$CLAUDE_TOOL_INPUT" | grep -qE 'qwvoice-ctl.*(pull|up|restart|rebuild)'; then
    exit 0
fi

health=$(ssh pinnaclepowerhouse 'curl -s http://localhost:3000/health' 2>/dev/null)
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
