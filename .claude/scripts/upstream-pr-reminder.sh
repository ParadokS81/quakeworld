#!/usr/bin/env bash
# Fired by PreToolUse hook in .claude/settings.json on Bash calls.
# Validates upstream-PR conventions on git commit / gh pr create / gh pr edit.
# Passes compliant commands through; blocks ONLY when convention is violated.
#
# Convention (CLAUDE.md "Upstream PRs" + memory/reference_upstream_pr_attribution.md
# + https://docs.kernel.org/process/coding-assistants.html):
#   * AI must NOT add Signed-off-by -- only the human submitter certifies DCO.
#     Operator adds their own Signed-off-by via 'git rebase --signoff upstream/master'.
#   * AI uses Assisted-by: <agent>:<model>, not Co-Authored-By: (the internal
#     monorepo shape that is wrong for upstream).
#
# Block conditions (exit 2 with specific reason on stderr):
#   1. Message contains Co-Authored-By: (wrong shape for upstream).
#   2. Message contains Signed-off-by: with an AI identifier
#      (claude / anthropic / openai / copilot, case-insensitive).
#
# Pass-through (exit 0):
#   * Compliant commits with Assisted-by: only (Claude's default at commit time).
#   * Commits with operator's Signed-off-by + Assisted-by: (post-rebase state).
#   * Any git commit in the monorepo (internal convention applies there).
#   * Any git push (commits already validated at commit time).
#   * Diagnostic failures (jq missing, malformed JSON) -- fail-open so the
#     operator is the DCO backstop, never silently blocked.
#
# See CLAUDE.md "Upstream PRs (outside this monorepo)" for the durable anchor.

MONOREPO_PREFIX="/home/paradoks/projects/quakeworld"

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)
hook_cwd=$(echo "$input" | jq -r '.cwd // ""' 2>/dev/null)

# Fail-open if we cannot parse the input.
if [[ -z "$command" ]]; then
  exit 0
fi

# Strip "..." and '...' quoted segments from the command so command-detection
# regexes do not false-match command names ("gh pr create", "git commit")
# appearing as content INSIDE a quoted -m / --body argument. Validation still
# runs against the full command (extract_message reads the unstripped form).
unquoted_command=$(HOOK_CMD="$command" python3 - <<'PYEOF'
import os, re
cmd = os.environ.get('HOOK_CMD', '')
cmd = re.sub(r'"(?:[^"\\]|\\.)*"', '""', cmd, flags=re.DOTALL)
cmd = re.sub(r"'(?:[^'\\]|\\.)*'", "''", cmd, flags=re.DOTALL)
print(cmd)
PYEOF
)

# Extract -m / --message / --body values from the command. Uses python with
# re.DOTALL so multi-line quoted commit-message bodies survive intact -- grep
# is line-oriented and would clip a heredoc-style message after the first line.
extract_message() {
  HOOK_CMD="$command" python3 - <<'PYEOF'
import os, re
cmd = os.environ.get('HOOK_CMD', '')
patterns = [
    r'-m\s+"((?:[^"\\]|\\.)*)"',
    r'--message=?\s*"((?:[^"\\]|\\.)*)"',
    r'--body\s+"((?:[^"\\]|\\.)*)"',
    r'--body=\s*"((?:[^"\\]|\\.)*)"',
]
msgs = []
for p in patterns:
    msgs.extend(re.findall(p, cmd, re.DOTALL))
print("\n\n".join(msgs))
PYEOF
}

emit_block() {
  local context="$1"
  local reason="$2"
  cat >&2 <<EOF
[upstream-pr-hook] BLOCKED: ${context}

${reason}

Convention (CLAUDE.md "Upstream PRs" / Linux kernel coding-assistants):
  * AI must NOT add Signed-off-by -- operator signs DCO via
    'git rebase --signoff upstream/master' AFTER AI commits land.
  * Use 'Assisted-by: Claude:claude-opus-4-7' (NOT 'Co-Authored-By:').

Reference: https://docs.kernel.org/process/coding-assistants.html
Detail:    ~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_upstream_pr_attribution.md
Anchor:    CLAUDE.md "Upstream PRs (outside this monorepo)".
EOF
}

# Returns 0 (pass) or 2 (block + reason emitted on stderr).
validate_message() {
  local msg="$1"
  local context="$2"

  # Block 1: Co-Authored-By trailer anywhere (wrong shape for upstream).
  if echo "$msg" | grep -qiE '^[[:space:]]*Co-Authored-By:'; then
    emit_block "$context" "Message contains a Co-Authored-By: trailer. That is the internal monorepo shape; upstream wants Assisted-by: instead."
    return 2
  fi

  # Block 2: Signed-off-by trailer with an AI identifier. Only the human
  # submitter signs the DCO; an AI Signed-off-by is legally meaningless and
  # violates the kernel coding-assistants rule the operator opted into.
  if echo "$msg" | grep -qiE '^[[:space:]]*Signed-off-by:.*\b(claude|anthropic|noreply@anthropic|openai|copilot|ai-bot)\b'; then
    emit_block "$context" "Message contains a Signed-off-by: trailer that names an AI. Only the human submitter signs the DCO. Use Assisted-by: for AI attribution; the operator's Signed-off-by lands via 'git rebase --signoff upstream/master' after AI commits."
    return 2
  fi

  return 0
}

# Path 1: gh pr create / gh pr edit -- always upstream by definition.
# Match against the unquoted command so the words "gh pr create" appearing
# inside a commit message body do NOT false-trigger this path.
if echo "$unquoted_command" | grep -qE '(^|[[:space:]])gh pr (create|edit)([[:space:]]|$)'; then
  msg=$(extract_message)
  validate_message "$msg" "gh pr create/edit" || exit 2
  exit 0
fi

# Path 2: git commit -- validate only when landing in an UPSTREAM worktree.
# The monorepo physically CONTAINS upstream clones at research/repos/* (each
# its own .git), so a path-prefix test is wrong in both directions: it false-
# blocks a leading `cd <monorepo-root>` AND false-allows commits into nested
# upstream repos. Resolve the effective dir, ask git which worktree it belongs
# to, compare to the monorepo toplevel exactly.
if echo "$unquoted_command" | grep -qE '(^|[[:space:]])git ([^ ]+ )*commit([[:space:]]|$)'; then
  # Effective dir, in priority order:
  #   (a) explicit `git -C <path>`
  #   (b) last `cd <path>` chained before the git call
  #   (c) the hook's reported .cwd (persistent Bash state across calls)
  effective_dir=$(echo "$command" | grep -oE 'git -C [^ ]+' | tail -1 | awk '{print $3}')
  if [[ -z "$effective_dir" ]]; then
    # Strip everything up to and including `cd<ws>`. The leading boundary may
    # be start-of-string (zero-width), so do NOT require a separator char.
    effective_dir=$(echo "$command" | grep -oE '(^|[[:space:]]|;|&)cd[[:space:]]+[^ ;&|]+' | tail -1 | sed -E 's/.*cd[[:space:]]+//')
  fi
  [[ -z "$effective_dir" ]] && effective_dir="$hook_cwd"

  # Strip surrounding quotes; resolve a relative dir against the hook cwd.
  effective_dir="${effective_dir%[\"\']}"
  effective_dir="${effective_dir#[\"\']}"
  if [[ "$effective_dir" != /* && -n "$hook_cwd" ]]; then
    effective_dir="$hook_cwd/$effective_dir"
  fi

  toplevel=$(git -C "$effective_dir" rev-parse --show-toplevel 2>/dev/null)

  # Fail-open: unresolvable repo, or the monorepo itself -> allow. The operator
  # is the DCO backstop, so a missed reminder is recoverable while a wrongful
  # block is the exact failure mode this rewrite fixes.
  if [[ -z "$toplevel" || "$toplevel" == "$MONOREPO_PREFIX" ]]; then
    exit 0
  fi

  # Upstream commit: validate the message content.
  msg=$(extract_message)
  validate_message "$msg" "git commit (upstream worktree: $toplevel)" || exit 2
  exit 0
fi

# Path 3: git push -- allow without validation. The commits being pushed have
# already been validated at commit time; a push is just transport. If an
# operator wants extra safety they can review `git log @{u}..HEAD` first.
exit 0
