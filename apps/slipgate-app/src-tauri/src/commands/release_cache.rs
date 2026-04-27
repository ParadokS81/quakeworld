use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::commands::data_root::data_root_path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReleaseEntry {
    /// Tag name as published on GitHub ("3.6.9", "v1.46", etc.).
    pub tag: String,
    /// ISO 8601 timestamp from the GitHub Releases API.
    pub published_at: String,
    pub download_url: Option<String>,
    /// Reserved for a future enrichment pass (parse checksums.txt assets).
    pub asset_sha256: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ClientReleaseCache {
    pub client: String,
    pub channel: String,
    pub last_fetched: u64,
    pub releases: Vec<ReleaseEntry>,
    /// Description of the source pipeline (variant of `DistributionShape`).
    pub source: String,
}

const CACHE_TTL_SECS: u64 = 24 * 60 * 60;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DistributionShape {
    GitHubReleases {
        owner: &'static str,
        repo: &'static str,
    },
    /// ezQuake snapshot pipeline (builds.quakeworld.nu). Stub in 3.5b — the
    /// existing snapshot scraper lives in `commands/updater.rs` and is NOT
    /// duplicated here per D3. Future arc consolidates.
    BuildsQuakeworld,
    /// FTE continuous nightly builds at fte.triptohell.info. Stub in 3.5b.
    FteTripToHell,
}

/// Per D11: keyed by `(client, channel)`. Returns the distribution shape
/// for the pair, or None if the pair is not recognized.
pub fn distribution_for(client: &str, channel: &str) -> Option<DistributionShape> {
    match (client, channel) {
        ("ezquake", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "ezquake",
            repo: "ezquake-source",
        }),
        ("ezquake", "snapshot") => Some(DistributionShape::BuildsQuakeworld),
        ("ktx", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group",
            repo: "ktx",
        }),
        ("mvdsv", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group",
            repo: "mvdsv",
        }),
        ("qwfwd", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group",
            repo: "qwfwd",
        }),
        ("unezquake", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "dusty-qw",
            repo: "unezquake",
        }),
        ("fte", "builds") => Some(DistributionShape::FteTripToHell),
        _ => None,
    }
}

/// Tier 2 verdict is only meaningful for channels with a real upstream catalog.
/// In 3.5b only GitHubReleases shapes return live data; the other two are stubs.
pub fn supports_tier2(client: &str, channel: &str) -> bool {
    matches!(
        distribution_for(client, channel),
        Some(DistributionShape::GitHubReleases { .. })
    )
}

pub fn cache_path(data_root: &Path, client: &str, channel: &str) -> PathBuf {
    data_root
        .join("release-cache")
        .join(format!("{}-{}.json", client, channel))
}

pub fn read_cache(data_root: &Path, client: &str, channel: &str) -> Option<ClientReleaseCache> {
    let path = cache_path(data_root, client, channel);
    if !path.exists() {
        return None;
    }
    let text = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn write_cache(data_root: &Path, cache: &ClientReleaseCache) -> Result<(), String> {
    let path = cache_path(data_root, &cache.client, &cache.channel);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let text = serde_json::to_string_pretty(cache).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

pub fn is_stale(cache: &ClientReleaseCache) -> bool {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    now.saturating_sub(cache.last_fetched) > CACHE_TTL_SECS
}

async fn fetch_github_releases(owner: &str, repo: &str) -> Result<Vec<ReleaseEntry>, String> {
    let url = format!("https://api.github.com/repos/{}/{}/releases", owner, repo);
    let resp = reqwest::Client::new()
        .get(&url)
        .header(reqwest::header::USER_AGENT, "slipgate-app/0.1")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status() == 403 {
        return Err("Rate limited by GitHub. Try again in a few minutes.".into());
    }
    if resp.status() == 404 {
        return Err(format!("Repository not found: {}/{}", owner, repo));
    }
    if !resp.status().is_success() {
        return Err(format!("GitHub API error: {}", resp.status()));
    }

    let releases: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    let entries = releases
        .iter()
        .map(|r| ReleaseEntry {
            tag: r["tag_name"].as_str().unwrap_or("").to_string(),
            published_at: r["published_at"].as_str().unwrap_or("").to_string(),
            download_url: r["assets"]
                .as_array()
                .and_then(|a| a.first())
                .and_then(|a| a["browser_download_url"].as_str())
                .map(|s| s.to_string()),
            asset_sha256: None,
        })
        .filter(|e| !e.tag.is_empty())
        .collect();
    Ok(entries)
}

/// FTE continuous-build scrape stub. Empty in 3.5b — fingerprinter classifies
/// FTE binaries by family + version without running them through Tier 2.
async fn fetch_fte_builds() -> Result<Vec<ReleaseEntry>, String> {
    Ok(Vec::new())
}

pub async fn get_releases(
    data_root: &Path,
    client: &str,
    channel: &str,
) -> Result<ClientReleaseCache, String> {
    if let Some(cache) = read_cache(data_root, client, channel) {
        if !is_stale(&cache) {
            return Ok(cache);
        }
    }

    let dist = distribution_for(client, channel)
        .ok_or_else(|| format!("no distribution shape for ({}, {})", client, channel))?;

    let releases = match dist {
        DistributionShape::GitHubReleases { owner, repo } => {
            fetch_github_releases(owner, repo).await?
        }
        DistributionShape::FteTripToHell => fetch_fte_builds().await?,
        DistributionShape::BuildsQuakeworld => {
            // F14 + D3: stub in 3.5b. Existing snapshot scraper lives in
            // commands/updater.rs and is intentionally not duplicated here.
            Vec::new()
        }
    };

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let cache = ClientReleaseCache {
        client: client.to_string(),
        channel: channel.to_string(),
        last_fetched: now,
        releases,
        source: format!("{:?}", dist),
    };
    write_cache(data_root, &cache)?;
    Ok(cache)
}

#[tauri::command]
pub async fn get_release_cache(
    app: tauri::AppHandle,
    client: String,
    channel: String,
) -> Result<ClientReleaseCache, String> {
    let root = data_root_path(&app)?;
    get_releases(&root, &client, &channel).await
}

const KNOWN_PAIRS: &[(&str, &str)] = &[
    ("ezquake", "stable"),
    ("ezquake", "snapshot"),
    ("ktx", "stable"),
    ("mvdsv", "stable"),
    ("qwfwd", "stable"),
    ("unezquake", "stable"),
    ("fte", "builds"),
];

#[tauri::command]
pub async fn refresh_all_release_caches(
    app: tauri::AppHandle,
) -> Result<HashMap<String, ClientReleaseCache>, String> {
    let root = data_root_path(&app)?;
    let mut out = HashMap::new();
    for (client, channel) in KNOWN_PAIRS {
        if let Ok(cache) = get_releases(&root, client, channel).await {
            out.insert(format!("{}-{}", client, channel), cache);
        }
    }
    Ok(out)
}

/// Per F9: normalize the binary's PE version string before comparing against
/// upstream tag names. PE FileVersion is "3.6.6.7949" (4-component); GitHub
/// tags are typically "3.6.6" or "v3.6.6". Strict equality without
/// normalization produces silent false negatives on common cases.
///
/// Known residual false-negatives (honest limits, not bugs):
/// - Old unezQuake-family builds with version strings like
///   "3.6-dev-alpha10-antilag-r402" don't normalize to a sensible tag and
///   render as Tier 3 — accurate, since those binaries predate dusty-qw's
///   first GitHub release.
/// - Snapshot binaries match nothing because the snapshot cache is stubbed.
/// - FTE binaries match nothing because the FTE cache is stubbed.
pub fn matches_official_release(cache: &ClientReleaseCache, version_str: &str) -> bool {
    let normalized = crate::commands::updater::parse_pe_version(version_str)
        .map(|(sv, _)| sv.to_string())
        .unwrap_or_else(|| version_str.to_string());

    cache.releases.iter().any(|r| {
        let tag = &r.tag;
        tag == version_str
            || *tag == format!("v{}", version_str)
            || *tag == normalized
            || *tag == format!("v{}", normalized)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn sample_cache(client: &str, channel: &str, tags: &[&str]) -> ClientReleaseCache {
        ClientReleaseCache {
            client: client.to_string(),
            channel: channel.to_string(),
            last_fetched: 1714000000,
            releases: tags
                .iter()
                .map(|t| ReleaseEntry {
                    tag: (*t).to_string(),
                    published_at: "2026-01-01T00:00:00Z".to_string(),
                    download_url: None,
                    asset_sha256: None,
                })
                .collect(),
            source: "test".to_string(),
        }
    }

    #[test]
    fn distribution_for_known_pairs() {
        assert!(matches!(
            distribution_for("ezquake", "stable"),
            Some(DistributionShape::GitHubReleases { .. })
        ));
        assert!(matches!(
            distribution_for("ezquake", "snapshot"),
            Some(DistributionShape::BuildsQuakeworld)
        ));
        assert!(matches!(
            distribution_for("fte", "builds"),
            Some(DistributionShape::FteTripToHell)
        ));
        assert!(distribution_for("nope", "stable").is_none());
    }

    #[test]
    fn supports_tier2_only_for_github_releases() {
        assert!(supports_tier2("ezquake", "stable"));
        assert!(supports_tier2("ktx", "stable"));
        assert!(!supports_tier2("ezquake", "snapshot"));
        assert!(!supports_tier2("fte", "builds"));
        assert!(!supports_tier2("unknown", "stable"));
    }

    #[test]
    fn read_cache_returns_none_when_missing() {
        let tmp = TempDir::new().unwrap();
        assert!(read_cache(tmp.path(), "ezquake", "stable").is_none());
    }

    #[test]
    fn cache_round_trip_per_channel() {
        let tmp = TempDir::new().unwrap();
        let stable = sample_cache("ezquake", "stable", &["3.6.9", "3.6.6"]);
        let snapshot = sample_cache("ezquake", "snapshot", &[]);
        write_cache(tmp.path(), &stable).unwrap();
        write_cache(tmp.path(), &snapshot).unwrap();

        let read_stable = read_cache(tmp.path(), "ezquake", "stable").unwrap();
        assert_eq!(read_stable.releases.len(), 2);
        let read_snapshot = read_cache(tmp.path(), "ezquake", "snapshot").unwrap();
        assert_eq!(read_snapshot.releases.len(), 0);

        // The two channels live in separate files — writing one does not
        // pollute the other.
        assert!(cache_path(tmp.path(), "ezquake", "stable").exists());
        assert!(cache_path(tmp.path(), "ezquake", "snapshot").exists());
        assert_ne!(
            cache_path(tmp.path(), "ezquake", "stable"),
            cache_path(tmp.path(), "ezquake", "snapshot")
        );
    }

    #[test]
    fn is_stale_after_24h() {
        let cache = ClientReleaseCache {
            last_fetched: 0,
            ..Default::default()
        };
        assert!(is_stale(&cache));

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let fresh = ClientReleaseCache {
            last_fetched: now,
            ..Default::default()
        };
        assert!(!is_stale(&fresh));
    }

    #[test]
    fn matches_official_release_exact_tag() {
        let cache = sample_cache("ezquake", "stable", &["3.6.9", "3.6.6"]);
        assert!(matches_official_release(&cache, "3.6.9"));
        assert!(matches_official_release(&cache, "3.6.6"));
        assert!(!matches_official_release(&cache, "3.6.10"));
    }

    #[test]
    fn matches_official_release_v_prefix() {
        let cache = sample_cache("ktx", "stable", &["v1.46", "v1.45"]);
        assert!(matches_official_release(&cache, "1.46"));
        assert!(matches_official_release(&cache, "v1.46"));
        assert!(!matches_official_release(&cache, "1.47"));
    }

    #[test]
    fn matches_official_release_normalized_pe_version() {
        // F9 case: PE FileVersion "3.6.6.7949" should match tag "3.6.9"... no, "3.6.6".
        let cache = sample_cache("ezquake", "stable", &["3.6.9", "3.6.6"]);
        assert!(matches_official_release(&cache, "3.6.6.7949"));
        assert!(matches_official_release(&cache, "3.6.9.0"));
        assert!(!matches_official_release(&cache, "3.6.10.0"));
    }

    #[test]
    fn matches_official_release_old_unezquake_does_not_match() {
        // Documented residual false-negative: pre-public unezQuake versions
        // don't normalize to a sensible tag.
        let cache = sample_cache("unezquake", "stable", &["1.3.5", "1.3.4"]);
        assert!(!matches_official_release(
            &cache,
            "3.6-dev-alpha10-antilag-r402"
        ));
    }

    #[test]
    fn matches_official_release_empty_cache_returns_false() {
        let empty = sample_cache("fte", "builds", &[]);
        assert!(!matches_official_release(&empty, "build-6698"));
    }
}
