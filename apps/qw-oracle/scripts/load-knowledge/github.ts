// apps/qw-oracle/scripts/load-knowledge/github.ts
//
// Narrow client for the GitHub REST API endpoints we need for PR enrichment.
// Requires a personal access token (passed via --github-token or GITHUB_TOKEN).

export interface PrInfo {
  pr_number: number;
  pr_title: string;
  pr_body: string;
  linked_issues: number[];
}

export interface RateLimitSnapshot {
  limit: number;
  remaining: number;
  reset_at_unix: number;
}

export class GitHubClient {
  private readonly token: string;
  private lastRateLimit: RateLimitSnapshot | null = null;

  constructor(token: string) {
    if (!token) {
      throw new Error('GitHub token is required; set --github-token or GITHUB_TOKEN');
    }
    this.token = token;
  }

  getRateLimit(): RateLimitSnapshot | null {
    return this.lastRateLimit;
  }

  async getReleaseBody(owner: string, repo: string, tag: string): Promise<string | null> {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'qw-oracle-loader',
      },
    });

    this.updateRateLimit(response.headers);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${url}: ${await response.text()}`);
    }

    const release = await response.json() as { body: string | null };
    return release.body ?? null;
  }

  async getPrsForCommit(owner: string, repo: string, sha: string): Promise<PrInfo | null> {
    if (sha === 'UNKNOWN') return null;
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/pulls`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'qw-oracle-loader',
      },
    });

    this.updateRateLimit(response.headers);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${url}: ${await response.text()}`);
    }

    const pulls = await response.json() as Array<{ number: number; title: string; body: string | null }>;
    if (pulls.length === 0) return null;

    const pull = pulls[0]!;
    const body = pull.body ?? '';
    return {
      pr_number: pull.number,
      pr_title: pull.title,
      pr_body: body,
      linked_issues: parseLinkedIssues(body),
    };
  }

  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const limit = headers.get('x-ratelimit-limit');
    const reset = headers.get('x-ratelimit-reset');
    if (remaining && limit && reset) {
      this.lastRateLimit = {
        limit: Number(limit),
        remaining: Number(remaining),
        reset_at_unix: Number(reset),
      };
    }
  }
}

function parseLinkedIssues(body: string): number[] {
  const pattern = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const out: number[] = [];
  for (const match of body.matchAll(pattern)) {
    if (match[1]) out.push(Number(match[1]));
  }
  return [...new Set(out)];
}
