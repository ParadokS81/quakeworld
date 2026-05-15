#!/usr/bin/env bash
# Fired by PreToolUse hook in .claude/settings.json on Bash calls.
# Validates the command internally before blocking -- the matcher's `if` field
# has been observed to fire on unrelated commands in this CC version, so the
# script re-checks the actual command and only blocks on the cases below.
#
# Blocks (exit 2 with reminder) when ANY of:
#   1. command is `gh pr create` or `gh pr edit`            -- always upstream
#   2. command is `git commit` or `git push` AND the target git worktree
#      is not the monorepo (e.g. a nested research/repos/* clone) -- upstream
#
# Exits 0 (allow) for everything else, including monorepo commits/pushes and
# diagnostic failures (jq missing, malformed JSON).
# See CLAUDE.md "Upstream PRs (outside this monorepo)" for the durable anchor.

MONOREPO_PREFIX="/home/paradoks/projects/quakeworld"

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)
hook_cwd=$(echo "$input" | jq -r '.cwd // ""' 2>/dev/null)

# Fail-safe: if we can't parse the input, don't block.
if [[ -z "$command" ]]; then
  exit 0
fi

emit_reminder() {
  local trigger="$1"
  cat >&2 <<EOF
[upstream-pr-hook] BLOCKED: ${trigger} detected.

Upstream OSS contribution. Apply the Linux kernel coding-assistants convention before retrying:
  * AI does NOT add Signed-off-by. Operator signs and certifies the DCO.
  * Use "Assisted-by: Claude:claude-opus-4-7" for AI attribution.
  * Do NOT use the internal "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>" shape.
  * Issues are exempt; this rule applies to PR commits and PR bodies.

Reference: https://docs.kernel.org/process/coding-assistants.html
Detail: ~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_upstream_pr_attribution.md
Project anchor: CLAUDE.md "Upstream PRs (outside this monorepo)".

To proceed: rebuild the commit message / PR body with an Assisted-by tag (no Signed-off-by from AI), then re-run.
EOF
}

# Path 1: gh pr create / gh pr edit -- always block, always upstream
if echo "$command" | grep -qE '(^|[[:space:]])gh pr (create|edit)([[:space:]]|$)'; then
  emit_reminder "gh pr create/edit"
  exit 2
fi

# Path 2: git commit / git push -- block only when the commit lands in an
# UPSTREAM git worktree (a different repo than the monorepo). The monorepo
# physically CONTAINS upstream clones at research/repos/* (each its own .git),
# so a path-prefix test is wrong in BOTH directions: it false-blocks a leading
# `cd <monorepo-root>` and false-allows commits into the nested upstream repos.
# Resolve the effective dir, then ask git which worktree it belongs to and
# compare to the monorepo toplevel exactly.
if echo "$command" | grep -qE '(^|[[:space:]])git ([^ ]+ )*(commit|push)([[:space:]]|$)'; then
  # Effective dir, in priority order:
  #   (a) explicit `git -C <path>`
  #   (b) last `cd <path>` chained before the git call
  #   (c) the hook's reported .cwd (persistent Bash state across calls)
  effective_dir=$(echo "$command" | grep -oE 'git -C [^ ]+' | tail -1 | awk '{print $3}')
  if [[ -z "$effective_dir" ]]; then
    # Strip everything up to and including `cd<ws>`. The leading boundary may
    # be start-of-string (zero-width), so do NOT require a separator char --
    # the old `s/^[[:space:];&]+cd //` left the literal "cd " on leading-cd
    # commands, which is the recurring false-block.
    effective_dir=$(echo "$command" | grep -oE '(^|[[:space:]]|;|&)cd[[:space:]]+[^ ;&|]+' | tail -1 | sed -E 's/.*cd[[:space:]]+//')
  fi
  [[ -z "$effective_dir" ]] && effective_dir="$hook_cwd"

  # Strip surrounding quotes; resolve a relative dir against the hook cwd.
  effective_dir="${effective_dir%[\"\']}"
  effective_dir="${effective_dir#[\"\']}"
  if [[ "$effective_dir" != /* && -n "$hook_cwd" ]]; then
    effective_dir="$hook_cwd/$effective_dir"
  fi

  # Which git worktree does this commit land in?
  toplevel=$(git -C "$effective_dir" rev-parse --show-toplevel 2>/dev/null)

  # Fail-open: unresolvable repo, or the monorepo itself -> allow. The operator
  # is the DCO backstop, so a missed reminder is recoverable while a wrongful
  # block is the exact bug being fixed.
  if [[ -z "$toplevel" || "$toplevel" == "$MONOREPO_PREFIX" ]]; then
    exit 0
  fi

  emit_reminder "git commit/push in upstream repo ($toplevel)"
  exit 2
fi

exit 0
