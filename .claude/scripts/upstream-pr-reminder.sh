#!/usr/bin/env bash
# Fired by PreToolUse hook in .claude/settings.json on Bash calls.
# Validates the command internally before blocking -- the matcher's `if` field
# has been observed to fire on unrelated commands in this CC version, so the
# script re-checks the actual command and only blocks on `gh pr create|edit`.
# Exits 2 with the reminder only when the command matches; exits 0 (allow) for
# everything else, including diagnostic failures (jq missing, malformed JSON).
# See CLAUDE.md "Upstream PRs (outside this monorepo)" for the durable anchor.

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)

# Fail-safe: if we can't parse the input, don't block.
if [[ -z "$command" ]]; then
  exit 0
fi

# Match `gh pr create` or `gh pr edit` as whitespace-bounded tokens.
# Boundary check avoids false positives on substrings (e.g. inside a URL or
# echo string) -- the create/edit must follow `gh pr ` and be followed by
# whitespace or end-of-string.
if ! echo "$command" | grep -qE '(^|[[:space:]])gh pr (create|edit)([[:space:]]|$)'; then
  exit 0
fi

cat >&2 <<'EOF'
[upstream-pr-hook] BLOCKED: gh pr create/edit detected.

Upstream OSS contribution. Apply the Linux kernel coding-assistants convention before retrying:
  * AI does NOT add Signed-off-by. Operator signs and certifies the DCO.
  * Use "Assisted-by: Claude:claude-opus-4-7" for AI attribution.
  * Do NOT use the internal "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>" shape.
  * Issues are exempt; this rule applies to PR commits and PR bodies.

Reference: https://docs.kernel.org/process/coding-assistants.html
Detail: ~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_upstream_pr_attribution.md
Project anchor: CLAUDE.md "Upstream PRs (outside this monorepo)".

To proceed: build the PR body/commit message with the operator's Signed-off-by line and an Assisted-by tag, then re-run.
EOF
exit 2
