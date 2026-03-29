"""Pair QW Hub matches to Craig recording window. Calculate audio offsets and confidence."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

from src.processing.craig_parser import CraigSession

logger = logging.getLogger(__name__)


@dataclass
class MatchPairing:
    """A QW Hub match paired to a position in the Craig recording."""

    match_id: int
    map_name: str
    timestamp: datetime
    server_hostname: str
    teams: list[dict] = field(default_factory=list)
    players: list[dict] = field(default_factory=list)
    ktxstats: dict | None = None
    duration_seconds: float = 1200.0
    audio_offset_seconds: float = 0.0
    audio_end_seconds: float = 0.0
    confidence: float = 0.0
    confidence_reasons: list[str] = field(default_factory=list)
    demo_sha256: str = ""


def pair_matches(
    craig_session: CraigSession,
    hub_matches: list[dict],
    ktxstats_map: dict[str, dict] | None = None,
    clock_tolerance_seconds: float = 5.0,
    padding_seconds: float = 10.0,
    default_duration: float = 1200.0,
) -> list[MatchPairing]:
    """Pair QW Hub matches to positions in the Craig recording.

    Args:
        craig_session: Parsed Craig session with start_time.
        hub_matches: List of match dicts from QW Hub API.
        ktxstats_map: Dict mapping demo_sha256 -> ktxstats dict.
        clock_tolerance_seconds: Allowed clock drift between Craig and QW Hub.
        padding_seconds: Extra seconds before/after match for audio slice.
        default_duration: Default match duration if ktxstats unavailable.

    Returns:
        List of MatchPairing objects sorted by audio offset.
    """
    ktxstats_map = ktxstats_map or {}
    pairings = []

    for match in hub_matches:
        match_ts_str = match.get("timestamp", "")
        if not match_ts_str:
            logger.warning("Match %s has no timestamp, skipping", match.get("id"))
            continue

        match_ts = datetime.fromisoformat(match_ts_str)
        if match_ts.tzinfo is None:
            match_ts = match_ts.replace(tzinfo=timezone.utc)

        craig_start = craig_session.start_time
        if craig_start.tzinfo is None:
            craig_start = craig_start.replace(tzinfo=timezone.utc)

        # Calculate audio offset: how many seconds into the recording this match starts
        offset = (match_ts - craig_start).total_seconds()

        # Get ktxstats if available
        demo_sha = match.get("demo_sha256", "")
        ktxstats = ktxstats_map.get(demo_sha)
        duration = default_duration

        if ktxstats and ktxstats.get("duration"):
            duration = float(ktxstats["duration"])

        audio_start = offset - padding_seconds
        audio_end = offset + duration + padding_seconds

        # Score confidence
        confidence, reasons = _score_confidence(
            match, craig_session, offset, ktxstats is not None
        )

        pairing = MatchPairing(
            match_id=match.get("id", 0),
            map_name=match.get("map", "unknown"),
            timestamp=match_ts,
            server_hostname=match.get("hostname", ""),
            teams=match.get("teams", []),
            players=match.get("players", []),
            ktxstats=ktxstats,
            duration_seconds=duration,
            audio_offset_seconds=audio_start,
            audio_end_seconds=audio_end,
            confidence=confidence,
            confidence_reasons=reasons,
            demo_sha256=demo_sha,
        )
        pairings.append(pairing)

    # Sort by audio offset
    pairings.sort(key=lambda p: p.audio_offset_seconds)

    # Validate no overlapping segments
    pairings = _validate_no_overlap(pairings)

    for p in pairings:
        logger.info(
            "Paired match %d (%s) at offset %.1fs-%.1fs, confidence=%.2f",
            p.match_id, p.map_name, p.audio_offset_seconds, p.audio_end_seconds, p.confidence,
        )

    return pairings


def _score_confidence(
    match: dict,
    craig_session: CraigSession,
    audio_offset: float,
    has_ktxstats: bool,
) -> tuple[float, list[str]]:
    """Score confidence of a match pairing.

    Returns:
        Tuple of (confidence_score 0.0-1.0, list of reason strings).
    """
    score = 0.0
    reasons = []

    # Factor 1: Offset is positive and reasonable (weight 0.3)
    if audio_offset > 60.0:
        score += 0.3
        reasons.append("offset > 60s into recording")
    elif audio_offset > 0:
        score += 0.15
        reasons.append(f"offset positive but small ({audio_offset:.1f}s)")
    else:
        reasons.append(f"offset negative ({audio_offset:.1f}s) - match before recording")

    # Factor 2: ktxstats available (weight 0.2)
    if has_ktxstats:
        score += 0.2
        reasons.append("ktxstats available (exact duration)")
    else:
        reasons.append("no ktxstats (using default duration)")

    # Factor 3: Player name overlap (weight 0.3)
    craig_names = set()
    for track in craig_session.tracks:
        craig_names.add(track.discord_username.lower())
        craig_names.add(track.discord_display_name.lower())

    match_names = set()
    for player in match.get("players", []):
        match_names.add(player.get("name", "").lower())

    overlap = craig_names & match_names
    if len(overlap) >= 3:
        score += 0.3
        reasons.append(f"{len(overlap)} player names match Craig tracks")
    elif len(overlap) >= 1:
        frac = len(overlap) / 3.0
        score += 0.3 * frac
        reasons.append(f"{len(overlap)} player name(s) match Craig tracks")
    else:
        reasons.append("no player name overlap with Craig tracks")

    # Factor 4: Offset within recording duration (weight 0.2)
    # Estimate recording duration from longest track (if we had it)
    # For now, check that offset is within a reasonable session window (4 hours)
    max_session = 4 * 3600  # 4 hours
    if 0 < audio_offset < max_session:
        score += 0.2
        reasons.append("offset within reasonable session window")
    else:
        reasons.append(f"offset {audio_offset:.1f}s outside expected range")

    return round(score, 2), reasons


def _validate_no_overlap(pairings: list[MatchPairing]) -> list[MatchPairing]:
    """Validate that pairings don't overlap and trim if needed."""
    if len(pairings) < 2:
        return pairings

    validated = [pairings[0]]
    for i in range(1, len(pairings)):
        prev = validated[-1]
        curr = pairings[i]

        if curr.audio_offset_seconds < prev.audio_end_seconds:
            # Overlap detected - trim the padding
            midpoint = (prev.audio_end_seconds + curr.audio_offset_seconds) / 2
            prev.audio_end_seconds = midpoint
            curr.audio_offset_seconds = midpoint
            logger.warning(
                "Trimmed overlap between match %d and %d at %.1fs",
                prev.match_id, curr.match_id, midpoint,
            )

        validated.append(curr)

    return validated


def format_pairing_summary(pairings: list[MatchPairing]) -> str:
    """Format a human-readable summary of match pairings."""
    if not pairings:
        return "No matches paired to this recording."

    lines = [f"Found {len(pairings)} match(es):\n"]
    for i, p in enumerate(pairings, 1):
        team_str = " vs ".join(
            f"{t.get('name', '?')} ({t.get('frags', '?')})"
            for t in p.teams
        )
        lines.append(f"  [{i}] {p.map_name} - {team_str}")
        lines.append(f"      Time: {p.timestamp.strftime('%H:%M:%S')} UTC")
        lines.append(f"      Audio: {p.audio_offset_seconds:.1f}s -> {p.audio_end_seconds:.1f}s")
        lines.append(f"      Duration: {p.duration_seconds:.0f}s")
        lines.append(f"      Confidence: {p.confidence:.0%}")
        for reason in p.confidence_reasons:
            lines.append(f"        - {reason}")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    # Quick test with hardcoded values from PLAN.md
    from datetime import datetime, timezone

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    # Simulated Craig session
    session = CraigSession(
        start_time=datetime(2026, 2, 1, 15, 54, 44, 674000, tzinfo=timezone.utc),
        tracks=[],
    )

    # Simulated match
    test_match = {
        "id": 12345,
        "timestamp": "2026-02-01T15:55:36+00:00",
        "map": "dm4",
        "demo_sha256": "abc123",
        "teams": [{"name": "]sr[", "frags": 100}, {"name": "red", "frags": 80}],
        "players": [{"name": "ParadokS"}, {"name": "Razor"}],
        "hostname": "Test Server",
    }

    pairings = pair_matches(session, [test_match])
    print(format_pairing_summary(pairings))
    # Expected offset: ~51.326s (15:55:36 - 15:54:44.674)
