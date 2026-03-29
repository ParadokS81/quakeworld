"""Split Craig audio using calculated timestamp offsets. Replaces tone-based splitting."""

from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path

from src.processing.craig_parser import CraigSession
from src.processing.match_pairer import MatchPairing
from src.utils.audio_utils import ensure_dir

logger = logging.getLogger(__name__)


def _ffprobe_duration(audio_path: Path) -> float:
    """Get audio duration in seconds using ffprobe (no decoding)."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {audio_path}: {result.stderr}")
    return float(result.stdout.strip())


def _ffmpeg_slice(
    input_path: Path, output_path: Path, start_sec: float, end_sec: float
) -> float:
    """Slice audio using ffmpeg with stream copy (no re-encoding).

    Returns actual duration of the output file.
    """
    result = subprocess.run(
        [
            "ffmpeg", "-y",
            "-ss", f"{start_sec:.3f}",
            "-to", f"{end_sec:.3f}",
            "-i", str(input_path),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            str(output_path),
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg slice failed: {result.stderr[-300:]}")
    return _ffprobe_duration(output_path)


def split_by_timestamps(
    craig_session: CraigSession,
    pairings: list[MatchPairing],
    output_dir: str | Path,
    player_name_map: dict[str, str] | None = None,
) -> list[dict]:
    """Split Craig audio tracks using match timestamp offsets.

    Args:
        craig_session: Parsed Craig session with tracks.
        pairings: List of MatchPairing objects with audio offsets.
        output_dir: Base output directory (e.g., processed/2026-01-29/).
        player_name_map: Optional Discord username -> QW name mapping.

    Returns:
        List of segment metadata dicts (compatible with existing pipeline).
    """
    output_dir = Path(output_dir)
    player_name_map = player_name_map or {}
    segments = []

    # Pre-fetch track durations once (ffprobe is fast)
    track_durations: dict[int, float] = {}
    for track in craig_session.tracks:
        if track.audio_path and track.audio_path.exists():
            track_durations[track.track_number] = _ffprobe_duration(track.audio_path)

    for idx, pairing in enumerate(pairings):
        map_dir_name = _build_dir_name(pairing, idx)
        audio_dir = ensure_dir(output_dir / map_dir_name / "audio")
        ensure_dir(output_dir / map_dir_name / "transcripts")
        ensure_dir(output_dir / map_dir_name / "analysis")

        players = []
        for track in craig_session.tracks:
            if not track.audio_path or not track.audio_path.exists():
                logger.warning(
                    "Skipping track %d (%s): no audio file",
                    track.track_number, track.discord_username,
                )
                continue

            player_name = _resolve_player_name(
                track.discord_username, track.discord_display_name, player_name_map
            )

            track_duration = track_durations[track.track_number]
            offsets = _clamp_offsets(
                pairing.audio_offset_seconds,
                pairing.audio_end_seconds,
                track_duration,
            )

            if offsets is None:
                continue

            start_sec, end_sec = offsets
            audio_fmt = track.audio_path.suffix.lstrip(".")
            out_path = audio_dir / f"{player_name}.{audio_fmt}"

            actual_duration = _ffmpeg_slice(
                track.audio_path, out_path, start_sec, end_sec
            )

            logger.info(
                "Split %s: %.1fs-%.1fs (%.1fs) -> %s",
                track.discord_username, start_sec, end_sec, actual_duration, out_path.name,
            )

            players.append({
                "name": player_name,
                "discord_username": track.discord_username,
                "audio_file": str(out_path),
                "duration": actual_duration,
            })

        # Build segment metadata
        segment = {
            "index": idx,
            "dir_name": map_dir_name,
            "map": pairing.map_name,
            "start_time": pairing.audio_offset_seconds,
            "end_time": pairing.audio_end_seconds,
            "players": players,
            "audio_dir": str(audio_dir),
            "match_id": pairing.match_id,
            "game_id": pairing.match_id,
            "demo_sha256": pairing.demo_sha256,
            "match_data": {
                "game_id": pairing.match_id,
                "timestamp": pairing.timestamp.isoformat(),
                "teams": pairing.teams,
                "players": pairing.players,
                "server": pairing.server_hostname,
                "confidence": pairing.confidence,
                "confidence_reasons": pairing.confidence_reasons,
            },
            "ktxstats": pairing.ktxstats,
        }
        segments.append(segment)

        # Write metadata.json per segment
        metadata_path = output_dir / map_dir_name / "metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(segment, f, indent=2, default=str)
        logger.info("Wrote metadata: %s", metadata_path)

    # Write session-level metadata
    session_meta = {
        "craig_start_time": craig_session.start_time.isoformat(),
        "recording_id": craig_session.recording_id,
        "guild_name": craig_session.guild_name,
        "channel_name": craig_session.channel_name,
        "tracks": [
            {
                "track_number": t.track_number,
                "discord_username": t.discord_username,
                "discord_display_name": t.discord_display_name,
            }
            for t in craig_session.tracks
        ],
        "segments": len(segments),
        "maps": [s["map"] for s in segments],
    }
    session_meta_path = output_dir / "session_metadata.json"
    with open(session_meta_path, "w", encoding="utf-8") as f:
        json.dump(session_meta, f, indent=2, default=str)

    logger.info("Split %d segments to %s", len(segments), output_dir)
    return segments


def extract_intermissions(
    craig_session: CraigSession,
    pairings: list[MatchPairing],
    output_dir: str | Path,
    player_name_map: dict[str, str] | None = None,
    min_gap_seconds: float = 30.0,
) -> list[dict]:
    """Extract audio from gaps between matches (pre-game, intermissions, post-game).

    These contain tactics discussion, debriefs, complaints, praise — valuable
    context for understanding team dynamics beyond in-game callouts.

    Args:
        craig_session: Parsed Craig session with tracks.
        pairings: List of MatchPairing objects (sorted by audio offset).
        output_dir: Base output directory.
        player_name_map: Optional Discord username -> QW name mapping.
        min_gap_seconds: Minimum gap duration to extract (skip tiny gaps).

    Returns:
        List of intermission segment metadata dicts.
    """
    output_dir = Path(output_dir)
    player_name_map = player_name_map or {}

    # Get total recording duration from longest track (ffprobe, no decoding)
    recording_duration = 0.0
    track_durations: dict[int, float] = {}
    for track in craig_session.tracks:
        if track.audio_path and track.audio_path.exists():
            dur = _ffprobe_duration(track.audio_path)
            track_durations[track.track_number] = dur
            recording_duration = max(recording_duration, dur)

    if recording_duration == 0.0:
        return []

    # Sort pairings by audio offset
    sorted_pairings = sorted(pairings, key=lambda p: p.audio_offset_seconds)

    # Identify gaps
    gaps: list[tuple[str, float, float]] = []

    # Gap before first match
    first_start = sorted_pairings[0].audio_offset_seconds if sorted_pairings else recording_duration
    if first_start > min_gap_seconds:
        gaps.append(("pre-game", 0.0, first_start))

    # Gaps between matches
    for i in range(len(sorted_pairings) - 1):
        current_end = sorted_pairings[i].audio_end_seconds
        next_start = sorted_pairings[i + 1].audio_offset_seconds
        gap_duration = next_start - current_end
        if gap_duration > min_gap_seconds:
            prev_map = sorted_pairings[i].map_name
            next_map = sorted_pairings[i + 1].map_name
            label = f"between_{prev_map}_and_{next_map}"
            gaps.append((label, current_end, next_start))

    # Gap after last match
    if sorted_pairings:
        last_end = sorted_pairings[-1].audio_end_seconds
        remaining = recording_duration - last_end
        if remaining > min_gap_seconds:
            gaps.append(("post-game", last_end, recording_duration))

    if not gaps:
        logger.info("No significant gaps found between matches")
        return []

    logger.info("Found %d intermission gap(s)", len(gaps))

    date_str = craig_session.start_time.strftime("%Y-%m-%d")
    intermissions = []

    for gap_idx, (label, gap_start, gap_end) in enumerate(gaps):
        dir_name = f"{date_str}_intermission_{gap_idx + 1:02d}_{label}"

        audio_dir = ensure_dir(output_dir / dir_name / "audio")
        ensure_dir(output_dir / dir_name / "transcripts")

        players = []
        for track in craig_session.tracks:
            if not track.audio_path or not track.audio_path.exists():
                continue

            player_name = _resolve_player_name(
                track.discord_username, track.discord_display_name, player_name_map
            )

            track_duration = track_durations[track.track_number]
            offsets = _clamp_offsets(gap_start, gap_end, track_duration)
            if offsets is None:
                continue

            start_sec, end_sec = offsets
            audio_fmt = track.audio_path.suffix.lstrip(".")
            out_path = audio_dir / f"{player_name}.{audio_fmt}"

            actual_duration = _ffmpeg_slice(
                track.audio_path, out_path, start_sec, end_sec
            )

            logger.info(
                "Intermission %s: %s %.1fs-%.1fs (%.1fs)",
                label, player_name, start_sec, end_sec, actual_duration,
            )

            players.append({
                "name": player_name,
                "discord_username": track.discord_username,
                "audio_file": str(out_path),
                "duration": actual_duration,
            })

        segment = {
            "index": gap_idx,
            "dir_name": dir_name,
            "map": "intermission",
            "label": label,
            "start_time": gap_start,
            "end_time": gap_end,
            "duration": gap_end - gap_start,
            "players": players,
            "audio_dir": str(audio_dir),
            "is_intermission": True,
        }
        intermissions.append(segment)

        # Write metadata
        metadata_path = output_dir / dir_name / "metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(segment, f, indent=2, default=str)

    logger.info("Extracted %d intermission segment(s)", len(intermissions))
    return intermissions


def _build_dir_name(pairing: MatchPairing, idx: int) -> str:
    """Build output directory name matching QW demo naming convention.

    Format: 2026-02-01_]sr[_vs_red_dm4_01
    Fallback: dm4_001 (if team data unavailable)
    """
    date_str = pairing.timestamp.strftime("%Y-%m-%d")
    map_name = pairing.map_name

    teams = pairing.teams
    if len(teams) >= 2:
        team1 = teams[0].get("name", "")
        team2 = teams[1].get("name", "")
        if team1 and team2:
            return f"{date_str}_{team1}_vs_{team2}_{map_name}_{idx + 1:02d}"

    # Fallback for matches without team data
    return f"{date_str}_{map_name}_{idx + 1:02d}"


def _resolve_player_name(
    discord_username: str,
    discord_display_name: str,
    player_name_map: dict[str, str],
) -> str:
    """Resolve a player's display name for output files.

    Priority:
        1. player_name_map lookup by discord_username
        2. discord_display_name (globalName)
        3. discord_username
    """
    if discord_username.lower() in player_name_map:
        return player_name_map[discord_username.lower()]
    if discord_display_name:
        return discord_display_name
    return discord_username


def _clamp_offsets(
    start: float, end: float, track_duration: float
) -> tuple[float, float] | None:
    """Clamp audio offsets to valid range within the track.

    Args:
        start: Desired start offset in seconds.
        end: Desired end offset in seconds.
        track_duration: Total track duration in seconds.

    Returns:
        Tuple of (clamped_start, clamped_end), or None if the segment
        falls entirely outside the track (e.g., player left early).
    """
    clamped_start = max(0.0, start)
    clamped_end = min(track_duration, end)

    if clamped_start >= clamped_end:
        logger.warning(
            "Segment %.1f-%.1f is outside track (%.1fs), skipping player",
            start, end, track_duration,
        )
        return None

    return clamped_start, clamped_end


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print("Usage: timestamp_splitter is called from the pipeline, not standalone.")
    print("Use pipeline.py to process Craig exports.")
