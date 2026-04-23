// apps/qw-oracle/scripts/load-knowledge/git.ts
//
// Thin wrapper around the `git` CLI. Uses spawnSync with an argv array
// (no shell interpolation), so repo paths and file names cannot be
// interpreted as shell commands.

import { spawnSync } from 'child_process';

export interface BlameResult {
  commit_sha: string;
  commit_message_excerpt: string;
}

function runGit(repoPath: string, args: string[]): { stdout: string; ok: boolean } {
  const result = spawnSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    return { stdout: '', ok: false };
  }
  return { stdout: result.stdout, ok: true };
}

export function blameLine(
  repoPath: string,
  revision: string,
  filePath: string,
  lineNumber: number,
): BlameResult | null {
  const blame = runGit(repoPath, [
    'blame',
    '-L', `${lineNumber},${lineNumber}`,
    '--porcelain',
    revision,
    '--',
    filePath,
  ]);
  if (!blame.ok) return null;

  const firstLine = blame.stdout.split('\n')[0] ?? '';
  const sha = firstLine.split(' ')[0] ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    return null;
  }

  const log = runGit(repoPath, ['log', '-1', '--format=%s%n%b', sha]);
  if (!log.ok) {
    return { commit_sha: sha, commit_message_excerpt: '' };
  }

  return {
    commit_sha: sha,
    commit_message_excerpt: log.stdout.slice(0, 300),
  };
}

/**
 * True if `revision` has a tree entry named `path` (a directory).
 * Used by diff-versions to detect whether a given tag has ezQuake's
 * post-2023-01-05 `src/` layout or the older root-level layout.
 */
export function treeHasDirectory(
  repoPath: string,
  revision: string,
  path: string,
): boolean {
  const result = runGit(repoPath, ['ls-tree', '-d', '--name-only', revision, path]);
  return result.ok && result.stdout.trim() === path;
}

export function headCommit(repoPath: string): string {
  const result = runGit(repoPath, ['rev-parse', 'HEAD']);
  if (!result.ok) throw new Error(`git rev-parse HEAD failed in ${repoPath}`);
  return result.stdout.trim();
}

/**
 * Batched commit-timestamp lookup. Returns a Map keyed by full 40-char sha
 * mapping to the committer Unix timestamp (%ct). Committer time is the
 * cluster-relevant signal: it answers "did these commits land together"
 * rather than "were they authored together". Shas that fail to resolve are
 * omitted from the map (callers should handle missing keys as skip).
 */
export function commitTimestamps(
  repoPath: string,
  shas: readonly string[],
): Map<string, number> {
  const out = new Map<string, number>();
  if (shas.length === 0) return out;
  const result = runGit(repoPath, ['show', '-s', '--format=%H %ct', ...shas]);
  if (!result.ok) return out;
  for (const line of result.stdout.split('\n')) {
    const [sha, ts] = line.trim().split(/\s+/);
    if (!sha || !ts) continue;
    const n = Number(ts);
    if (Number.isFinite(n)) out.set(sha, n);
  }
  return out;
}
