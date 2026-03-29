"""QW Hub API client for match history and ktxstats."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = "https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3Boa2pmb21pbmlteHp0amlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY5Mzg1NjMsImV4cCI6MjAxMjUxNDU2M30."
    "NN6hjlEW-qB4Og9hWAVlgvUdwrbBO13s8OkAJuBGVbo"
)
KTXSTATS_BASE_URL = "https://d.quake.world"


class QWHubClient:
    """HTTP client for the QW Hub Supabase REST API."""

    def __init__(self, config: dict | None = None):
        config = config or {}
        api_config = config.get("api", {})
        self._url = api_config.get("supabase_url", SUPABASE_URL)
        self._anon_key = api_config.get("supabase_anon_key", SUPABASE_ANON_KEY)
        self._ktxstats_base = api_config.get("ktxstats_base_url", KTXSTATS_BASE_URL)
        self._timeout = api_config.get("timeout_seconds", 30)
        self._session_buffer = api_config.get("session_buffer_minutes", 15)
        self._client = httpx.Client(
            timeout=self._timeout,
            headers={
                "apikey": self._anon_key,
                "Accept": "application/json",
            },
        )

    def find_matches(
        self,
        start_time: str,
        end_time: str,
        player_query: str | None = None,
        mode: str = "4on4",
    ) -> list[dict]:
        """Query QW Hub for matches in a time window.

        Args:
            start_time: ISO 8601 timestamp (inclusive).
            end_time: ISO 8601 timestamp (exclusive).
            player_query: Full-text search on players column.
            mode: Game mode filter (default: 4on4).

        Returns:
            List of match dicts sorted by timestamp ascending.
        """
        params: dict[str, str] = {
            "mode": f"eq.{mode}",
            "timestamp": f"gte.{start_time}",
            "order": "timestamp.asc",
        }
        # Supabase doesn't support two filters on the same column via params,
        # so we use the `and` filter syntax for the upper bound.
        params["and"] = f"(timestamp.lt.{end_time})"

        if player_query:
            params["players_fts"] = f"fts.{player_query}"

        logger.info("Querying QW Hub: %s -> %s (player=%s)", start_time, end_time, player_query)
        resp = self._client.get(self._url, params=params)
        resp.raise_for_status()
        matches = resp.json()
        logger.info("Found %d matches", len(matches))
        return matches

    def fetch_ktxstats(self, demo_sha256: str) -> dict | None:
        """Fetch ktxstats JSON for a demo by its SHA256 hash.

        Args:
            demo_sha256: Full SHA256 hex string of the MVD demo.

        Returns:
            Parsed ktxstats dict, or None if unavailable.
        """
        if not demo_sha256:
            return None

        prefix = demo_sha256[:3]
        url = f"{self._ktxstats_base}/{prefix}/{demo_sha256}.mvd.ktxstats.json"
        logger.info("Fetching ktxstats: %s", url)

        try:
            resp = self._client.get(url)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning("ktxstats not found for %s", demo_sha256[:16])
                return None
            raise
        except httpx.RequestError as e:
            logger.warning("ktxstats request failed for %s: %s", demo_sha256[:16], e)
            return None

    def find_matches_for_session(
        self,
        craig_start: str,
        craig_duration_seconds: float,
        player_query: str | None = None,
    ) -> list[dict]:
        """Find matches that fall within a Craig recording session.

        Adds a buffer before and after the recording window to account for
        clock drift and matches that may have started before recording.

        Args:
            craig_start: ISO 8601 start time of Craig recording.
            craig_duration_seconds: Total duration of the recording.
            player_query: Full-text search on players column.

        Returns:
            List of match dicts sorted by timestamp ascending.
        """
        start_dt = datetime.fromisoformat(craig_start.replace("Z", "+00:00"))
        buffer = timedelta(minutes=self._session_buffer)

        window_start = start_dt - buffer
        window_end = start_dt + timedelta(seconds=craig_duration_seconds) + buffer

        return self.find_matches(
            start_time=window_start.isoformat(),
            end_time=window_end.isoformat(),
            player_query=player_query,
        )

    def close(self):
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


if __name__ == "__main__":
    import json
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    # Quick test: query recent ]sr[ matches
    with QWHubClient() as client:
        if len(sys.argv) >= 3:
            start, end = sys.argv[1], sys.argv[2]
            player = sys.argv[3] if len(sys.argv) > 3 else None
        else:
            # Default: query 2026-01-29 evening session
            start = "2026-01-29T21:00:00+00:00"
            end = "2026-01-29T23:00:00+00:00"
            player = "paradok"

        matches = client.find_matches(start, end, player_query=player)
        print(json.dumps(matches, indent=2, default=str))

        # Fetch ktxstats for first match if available
        if matches and matches[0].get("demo_sha256"):
            stats = client.fetch_ktxstats(matches[0]["demo_sha256"])
            if stats:
                print(f"\nktxstats for match {matches[0]['id']}:")
                print(f"  map: {stats.get('map')}")
                print(f"  duration: {stats.get('duration')}s")
