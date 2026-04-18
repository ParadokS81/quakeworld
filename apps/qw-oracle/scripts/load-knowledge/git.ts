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

export function headCommit(repoPath: string): string {
  const result = runGit(repoPath, ['rev-parse', 'HEAD']);
  if (!result.ok) throw new Error(`git rev-parse HEAD failed in ${repoPath}`);
  return result.stdout.trim();
}
