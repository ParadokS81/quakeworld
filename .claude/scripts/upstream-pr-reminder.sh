#!/usr/bin/env bash
# Fired by PreToolUse hook in .claude/settings.json on `gh pr create` / `gh pr edit`.
# Exits 2 to block the call; Claude must apply the upstream-PR convention before retrying.
# See CLAUDE.md "Upstream PRs (outside this monorepo)" subsection for the durable anchor.

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
