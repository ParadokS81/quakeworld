import { describe, expect, test } from "bun:test";
import {
  getReleaseCache,
  refreshAllReleaseCaches,
  matchesOfficialRelease,
  isStubChannel,
  type ClientReleaseCache,
} from "./releaseCache";

function sample(client: string, channel: string, tags: string[]): ClientReleaseCache {
  return {
    client,
    channel,
    last_fetched: 1714000000,
    releases: tags.map((t) => ({
      tag: t,
      published_at: "2026-01-01T00:00:00Z",
      download_url: null,
      asset_sha256: null,
    })),
    source: "test",
  };
}

describe("releaseCache wrappers", () => {
  test("getReleaseCache forwards client + channel", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return sample("ezquake", "stable", ["3.6.9"]) as T;
    };
    const r = await getReleaseCache(invoke, "ezquake", "stable");
    expect(r.releases.length).toBe(1);
    expect(calls).toEqual([
      ["get_release_cache", { client: "ezquake", channel: "stable" }],
    ]);
  });

  test("refreshAllReleaseCaches dispatches command without args", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return {} as T;
    };
    await refreshAllReleaseCaches(invoke);
    expect(calls[0][0]).toBe("refresh_all_release_caches");
    expect(calls[0][1]).toBeUndefined();
  });
});

describe("matchesOfficialRelease", () => {
  test("exact-tag match", () => {
    const c = sample("ezquake", "stable", ["3.6.9", "3.6.6"]);
    expect(matchesOfficialRelease(c, "3.6.9")).toBe(true);
    expect(matchesOfficialRelease(c, "3.6.10")).toBe(false);
  });

  test("v-prefix tags match unprefixed PE versions", () => {
    const c = sample("ktx", "stable", ["v1.46"]);
    expect(matchesOfficialRelease(c, "1.46")).toBe(true);
    expect(matchesOfficialRelease(c, "v1.46")).toBe(true);
    expect(matchesOfficialRelease(c, "1.45")).toBe(false);
  });

  test("4-component PE version normalizes to 3-component tag", () => {
    const c = sample("ezquake", "stable", ["3.6.9", "3.6.6"]);
    expect(matchesOfficialRelease(c, "3.6.6.7949")).toBe(true);
    expect(matchesOfficialRelease(c, "3.6.10.0")).toBe(false);
  });

  test("empty cache (stub state) never matches", () => {
    const empty = sample("fte", "builds", []);
    expect(matchesOfficialRelease(empty, "build-6698")).toBe(false);
  });
});

describe("isStubChannel", () => {
  test("ezquake-snapshot is stubbed in 3.5b", () => {
    expect(isStubChannel("ezquake", "snapshot")).toBe(true);
    expect(isStubChannel("ezquake", "stable")).toBe(false);
  });

  test("fte-builds is stubbed in 3.5b", () => {
    expect(isStubChannel("fte", "builds")).toBe(true);
  });

  test("other GitHub-Releases channels are live", () => {
    expect(isStubChannel("ktx", "stable")).toBe(false);
    expect(isStubChannel("unezquake", "stable")).toBe(false);
  });
});
