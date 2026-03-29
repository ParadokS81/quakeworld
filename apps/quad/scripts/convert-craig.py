#!/usr/bin/env python3
"""
Convert Craig bot zip exports into Quad-compatible recording directories.

Extracts OGG audio files and generates session_metadata.json so the
Quad processing pipeline can consume Craig recordings directly.

Usage:
    python3 scripts/convert-craig.py <craig.zip>
    python3 scripts/convert-craig.py <craig.zip> --output-dir ./recordings
    python3 scripts/convert-craig.py *.zip                                  # batch mode

If output_dir is not specified, creates directories under ./recordings/

No transcoding — OGG files are copied as-is. Download Craig recordings
in OGG Vorbis format (not FLAC) for best results.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path


def parse_raw_dat(raw_bytes: bytes) -> dict:
    """Parse the JSON header from Craig's raw.dat binary file."""
    depth = 0
    end = 0
    for i, b in enumerate(raw_bytes):
        if b < 128:
            c = chr(b)
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
    if end == 0:
        raise ValueError("Could not find JSON header in raw.dat")
    return json.loads(raw_bytes[:end].decode("utf-8"))


def parse_info_txt(text: str) -> dict:
    """Parse Craig's info.txt metadata file."""
    info = {"tracks": {}}
    lines = text.strip().splitlines()

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("Recording "):
            info["recording_id"] = stripped.split("Recording ", 1)[1].strip()
        elif stripped.startswith("Guild:"):
            parts = stripped.split(":", 1)[1].strip()
            if "(" in parts:
                info["guild_name"] = parts.rsplit("(", 1)[0].strip()
                info["guild_id"] = parts.rsplit("(", 1)[1].rstrip(")")
            else:
                info["guild_name"] = parts
        elif stripped.startswith("Channel:"):
            parts = stripped.split(":", 1)[1].strip()
            if "(" in parts:
                info["channel_name"] = parts.rsplit("(", 1)[0].strip()
                info["channel_id"] = parts.rsplit("(", 1)[1].rstrip(")")
            else:
                info["channel_name"] = parts
        elif stripped.startswith("Start time:"):
            info["start_time"] = stripped.split(":", 1)[1].strip().lstrip()

    # Parse tracks section
    in_tracks = False
    track_num = 1
    for line in lines:
        stripped = line.strip()
        if stripped == "Tracks:":
            in_tracks = True
            continue
        if in_tracks and stripped:
            username = stripped.split("#")[0] if "#" in stripped else stripped.split("(")[0].strip()
            discord_id = ""
            if "(" in stripped:
                discord_id = stripped.rsplit("(", 1)[1].rstrip(")")
            info["tracks"][str(track_num)] = {
                "username": username,
                "id": discord_id,
                "globalName": username,
            }
            track_num += 1

    return info


def ffprobe_duration(path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def convert_craig_zip(zip_path: str, output_base: str) -> str:
    """Convert a Craig zip export to Quad recording directory format.

    Extracts OGG files as-is (no transcoding) and writes session_metadata.json.
    Returns the path to the created session directory.
    """
    zip_path = Path(zip_path)
    if not zip_path.exists():
        raise FileNotFoundError(f"Craig zip not found: {zip_path}")

    print(f"\n{'='*60}")
    print(f"Converting: {zip_path.name}")
    print(f"{'='*60}")

    # Extract to temp directory
    with tempfile.TemporaryDirectory(prefix="craig_") as tmp_dir:
        tmp = Path(tmp_dir)

        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(tmp)

        # Parse metadata — prefer raw.dat over info.txt
        raw_dat_path = tmp / "raw.dat"
        info_txt_path = tmp / "info.txt"

        if raw_dat_path.exists():
            header = parse_raw_dat(raw_dat_path.read_bytes())
            start_time = header["startTime"]
            recording_id = header.get("id", "")
            guild_name = header.get("guild", "")
            guild_id = header.get("guildExtra", {}).get("id", "")
            channel_name = header.get("channel", "")
            channel_id = header.get("channelExtra", {}).get("id", "")
            tracks_meta = header.get("tracks", {})
            print(f"  Parsed raw.dat: {len(tracks_meta)} tracks")
        elif info_txt_path.exists():
            info = parse_info_txt(info_txt_path.read_text())
            start_time = info.get("start_time", "")
            recording_id = info.get("recording_id", "")
            guild_name = info.get("guild_name", "")
            guild_id = info.get("guild_id", "")
            channel_name = info.get("channel_name", "")
            channel_id = info.get("channel_id", "")
            tracks_meta = info.get("tracks", {})
            print(f"  Parsed info.txt: {len(tracks_meta)} tracks")
        else:
            raise ValueError(f"No raw.dat or info.txt found in {zip_path}")

        print(f"  Start time: {start_time}")
        print(f"  Guild: {guild_name}")
        print(f"  Craig ID: {recording_id}")

        # Generate deterministic session ID from Craig recording ID
        session_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"craig:{recording_id}"))
        session_dir = Path(output_base) / session_id

        if session_dir.exists():
            print(f"  Session directory already exists: {session_dir}")
            print(f"  Skipping (delete it first to re-convert)")
            return str(session_dir)

        session_dir.mkdir(parents=True, exist_ok=True)
        print(f"  Session dir: {session_dir}")

        # Find audio files in extracted directory
        audio_files = list(tmp.glob("*.ogg")) + list(tmp.glob("*.flac"))
        audio_by_track: dict[int, Path] = {}
        for f in audio_files:
            parts = f.stem.split("-", 1)
            if parts[0].isdigit():
                num = int(parts[0])
                if num not in audio_by_track or f.suffix == ".ogg":
                    audio_by_track[num] = f

        # Process each track — just copy, no transcoding
        tracks = []
        max_duration = 0.0

        for track_num_str, meta in sorted(tracks_meta.items(), key=lambda x: int(x[0])):
            track_num = int(track_num_str)
            username = meta.get("username", f"track_{track_num}")
            display_name = meta.get("globalName", username)
            discord_id = meta.get("id", "")

            source_audio = audio_by_track.get(track_num)
            if not source_audio:
                print(f"  Track {track_num} ({username}): no audio file, skipping")
                continue

            # Keep original extension — no transcoding
            ext = source_audio.suffix  # .ogg or .flac
            out_filename = f"{track_num}-{username}{ext}"
            out_path = session_dir / out_filename

            # Just copy the file
            shutil.copy2(str(source_audio), str(out_path))

            # Get duration via ffprobe
            duration = ffprobe_duration(str(out_path))
            max_duration = max(max_duration, duration)

            size_mb = out_path.stat().st_size / (1024 * 1024)
            dur_str = f"{duration/3600:.1f}h" if duration > 3600 else f"{duration/60:.1f}m"
            print(f"  Track {track_num} ({username}): {dur_str}, {size_mb:.1f} MB [{ext}]")

            tracks.append({
                "track_number": track_num,
                "discord_user_id": discord_id,
                "discord_username": username,
                "discord_display_name": display_name,
                "joined_at": start_time,
                "left_at": "",
                "audio_file": out_filename,
            })

        # Calculate recording end time from longest track
        start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        end_dt = start_dt + timedelta(seconds=max_duration)
        end_time = end_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00"

        # Fill in left_at
        for track in tracks:
            track["left_at"] = end_time

        # Write session_metadata.json (Quad format)
        metadata = {
            "schema_version": 1,
            "recording_start_time": start_time.replace("Z", "+00:00") if start_time.endswith("Z") else start_time,
            "recording_end_time": end_time,
            "recording_id": session_id,
            "source": "craig",
            "source_version": "craig-export",
            "guild": {"id": guild_id, "name": guild_name},
            "channel": {"id": channel_id, "name": channel_name},
            "team": {"tag": "]sr[", "name": "Slackers"},
            "tracks": tracks,
        }

        meta_path = session_dir / "session_metadata.json"
        meta_path.write_text(json.dumps(metadata, indent=2))

        print(f"\n  session_metadata.json written ({len(tracks)} tracks)")
        print(f"  Recording duration: {max_duration/3600:.1f}h ({max_duration:.0f}s)")
        print(f"  Session ID: {session_id}")

        return str(session_dir)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    zip_paths = []
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "recordings")

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--output-dir" and i + 1 < len(args):
            output_dir = args[i + 1]
            i += 2
        else:
            zip_paths.append(args[i])
            i += 1

    if not zip_paths:
        print("Error: no zip files specified")
        sys.exit(1)

    print(f"Output directory: {output_dir}")

    results = []
    for zp in zip_paths:
        try:
            session_dir = convert_craig_zip(zp, output_dir)
            results.append((zp, session_dir, None))
        except Exception as e:
            print(f"\nError converting {zp}: {e}")
            results.append((zp, None, str(e)))

    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    for zp, session_dir, error in results:
        name = os.path.basename(zp)
        if error:
            print(f"  FAIL  {name}: {error}")
        else:
            print(f"  OK    {name} -> {session_dir}")

    failures = sum(1 for _, _, e in results if e)
    if failures:
        print(f"\n{failures} conversion(s) failed")
        sys.exit(1)
    else:
        print(f"\n{len(results)} recording(s) converted successfully")
        print(f"\nProcess them with: /process rerun <session_id>")


if __name__ == "__main__":
    main()
