"""Parse Craig bot zip exports. Extract startTime, track metadata, FLAC paths."""

from __future__ import annotations

import json
import logging
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class CraigTrack:
    """A single speaker track from a Craig recording."""

    track_number: int
    discord_username: str  # "paradoks"
    discord_display_name: str  # "ParadokS"
    audio_path: Path | None = None
    duration_seconds: float | None = None


@dataclass
class CraigSession:
    """Parsed Craig recording session."""

    start_time: datetime  # UTC, ms precision from raw.dat
    tracks: list[CraigTrack] = field(default_factory=list)
    recording_id: str = ""
    guild_name: str = ""
    channel_name: str = ""
    source_path: Path | None = None
    extracted_dir: Path | None = None


def parse_craig_export(source: str | Path) -> CraigSession:
    """Parse a Craig bot export (zip file or extracted directory).

    Args:
        source: Path to a Craig zip file or extracted directory.

    Returns:
        CraigSession with startTime, tracks, and metadata.

    Raises:
        FileNotFoundError: If source doesn't exist.
        ValueError: If no valid Craig metadata found.
    """
    source = Path(source)
    if not source.exists():
        raise FileNotFoundError(f"Craig export not found: {source}")

    if source.is_file() and source.suffix == ".zip":
        extracted_dir = _extract_zip(source)
        session = _parse_directory(extracted_dir)
        session.source_path = source
        session.extracted_dir = extracted_dir
    elif source.is_dir():
        session = _parse_directory(source)
        session.source_path = source
        session.extracted_dir = source
    else:
        raise ValueError(f"Expected a .zip file or directory: {source}")

    return session


def _parse_directory(directory: Path) -> CraigSession:
    """Parse an extracted Craig directory."""
    raw_dat = directory / "raw.dat"
    info_txt = directory / "info.txt"

    # Try raw.dat first (has ms-precision startTime)
    if raw_dat.exists():
        start_time, raw_tracks = _parse_raw_dat(raw_dat)
        tracks = _match_tracks_to_files(raw_tracks, directory)
        session = CraigSession(start_time=start_time, tracks=tracks)
    elif info_txt.exists():
        info = _parse_info_txt(info_txt)
        start_time = datetime.fromisoformat(
            info["start_time"].replace("Z", "+00:00")
        )
        tracks = _match_tracks_to_files(info.get("tracks", []), directory)
        session = CraigSession(
            start_time=start_time,
            tracks=tracks,
            recording_id=info.get("recording_id", ""),
            guild_name=info.get("guild_name", ""),
            channel_name=info.get("channel_name", ""),
        )
    else:
        raise ValueError(f"No raw.dat or info.txt found in {directory}")

    # Try to enrich from info.txt even if we used raw.dat
    if raw_dat.exists() and info_txt.exists():
        info = _parse_info_txt(info_txt)
        session.recording_id = info.get("recording_id", "")
        session.guild_name = info.get("guild_name", "")
        session.channel_name = info.get("channel_name", "")

    logger.info(
        "Parsed Craig session: start=%s, tracks=%d, id=%s",
        session.start_time.isoformat(),
        len(session.tracks),
        session.recording_id,
    )
    return session


def _parse_raw_dat(raw_dat_path: Path) -> tuple[datetime, list[dict]]:
    """Parse the JSON header from a Craig raw.dat file.

    The raw.dat file starts with a JSON object followed by binary Opus audio.
    We extract the JSON by counting braces to find where it ends.

    Returns:
        Tuple of (start_time, track_info_list).
    """
    with open(raw_dat_path, "rb") as f:
        # Read enough bytes to capture the JSON header (usually < 1KB)
        header_bytes = f.read(4096)

    # Find the end of the JSON object by brace counting
    depth = 0
    json_end = 0
    for i, byte in enumerate(header_bytes):
        char = chr(byte) if byte < 128 else ""
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                json_end = i + 1
                break

    if json_end == 0:
        raise ValueError(f"Could not find JSON header in {raw_dat_path}")

    header_json = header_bytes[:json_end].decode("utf-8")
    header = json.loads(header_json)
    logger.debug("raw.dat header: %s", header)

    start_time_str = header.get("startTime", "")
    if not start_time_str:
        raise ValueError("No startTime in raw.dat header")

    start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))

    # Parse tracks: {"1": {"username": "paradoks", "globalName": "ParadokS"}}
    raw_tracks = []
    for track_num, track_info in header.get("tracks", {}).items():
        raw_tracks.append({
            "track_number": int(track_num),
            "username": track_info.get("username", f"track_{track_num}"),
            "display_name": track_info.get("globalName", track_info.get("username", f"track_{track_num}")),
        })

    return start_time, raw_tracks


def _parse_info_txt(info_path: Path) -> dict:
    """Parse Craig info.txt metadata file.

    Format:
        Recording <id>

        Guild:      Name (id)
        Channel:    Name (id)
        Requester:  user#0 (id)
        Start time: 2026-02-01T15:54:44.674Z

        Tracks:
            user1#0 (id)
            user2#0 (id)
    """
    text = info_path.read_text(encoding="utf-8")
    lines = text.strip().splitlines()

    info: dict = {"tracks": []}

    for line in lines:
        line = line.strip()
        if line.startswith("Recording "):
            info["recording_id"] = line.split("Recording ", 1)[1].strip()
        elif line.startswith("Guild:"):
            info["guild_name"] = line.split(":", 1)[1].strip().split("(")[0].strip()
        elif line.startswith("Channel:"):
            info["channel_name"] = line.split(":", 1)[1].strip().split("(")[0].strip()
        elif line.startswith("Start time:"):
            info["start_time"] = line.split(":", 1)[1].strip()
            # Handle "Start time:\t..." format
            info["start_time"] = info["start_time"].lstrip()

    # Parse tracks section
    in_tracks = False
    track_num = 1
    for line in lines:
        stripped = line.strip()
        if stripped == "Tracks:":
            in_tracks = True
            continue
        if in_tracks and stripped:
            # Format: "username#0 (id)"
            username = stripped.split("#")[0] if "#" in stripped else stripped.split("(")[0].strip()
            info["tracks"].append({
                "track_number": track_num,
                "username": username,
                "display_name": username,
            })
            track_num += 1

    return info


def _match_tracks_to_files(
    tracks: list[dict], extracted_dir: Path
) -> list[CraigTrack]:
    """Match track metadata to audio files on disk.

    Craig naming convention: {track_number}-{username}.{ext}
    Supports FLAC and OGG (Opus) formats. Prefers OGG if both exist.
    """
    audio_files = list(extracted_dir.glob("*.flac")) + list(extracted_dir.glob("*.ogg"))
    audio_by_number: dict[int, Path] = {}

    for f in audio_files:
        # Parse track number from filename: "1-paradoks.ogg" -> 1
        parts = f.stem.split("-", 1)
        if parts[0].isdigit():
            num = int(parts[0])
            # Prefer OGG over FLAC if both exist (smaller, same quality from Discord)
            if num not in audio_by_number or f.suffix == ".ogg":
                audio_by_number[num] = f

    craig_tracks = []
    for track_info in tracks:
        track_num = track_info["track_number"]
        audio_path = audio_by_number.get(track_num)

        craig_tracks.append(CraigTrack(
            track_number=track_num,
            discord_username=track_info["username"],
            discord_display_name=track_info.get("display_name", track_info["username"]),
            audio_path=audio_path,
        ))

        if audio_path:
            logger.debug("Track %d (%s) -> %s", track_num, track_info["username"], audio_path.name)
        else:
            logger.warning("No audio file found for track %d (%s)", track_num, track_info["username"])

    return craig_tracks


def _extract_zip(zip_path: Path) -> Path:
    """Extract a Craig zip to a temporary directory.

    Returns:
        Path to extracted directory.
    """
    extract_dir = Path(tempfile.mkdtemp(prefix="craig_"))
    logger.info("Extracting %s to %s", zip_path.name, extract_dir)

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    # Craig zips sometimes have a subdirectory
    subdirs = [d for d in extract_dir.iterdir() if d.is_dir()]
    has_audio = list(extract_dir.glob("*.flac")) or list(extract_dir.glob("*.ogg"))
    if len(subdirs) == 1 and not has_audio:
        return subdirs[0]

    return extract_dir


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.DEBUG, format="%(levelname)s: %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python -m src.processing.craig_parser <craig_zip_or_dir>")
        sys.exit(1)

    session = parse_craig_export(sys.argv[1])
    print(f"Start time: {session.start_time.isoformat()}")
    print(f"Recording ID: {session.recording_id}")
    print(f"Guild: {session.guild_name}")
    print(f"Channel: {session.channel_name}")
    print(f"Tracks ({len(session.tracks)}):")
    for t in session.tracks:
        print(f"  {t.track_number}: {t.discord_username} ({t.discord_display_name}) -> {t.audio_path}")
