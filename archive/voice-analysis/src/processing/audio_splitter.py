"""LEGACY: Split multi-track Craig recordings by map using detected markers.

NOTE: This module is superseded by timestamp_splitter.py which uses
QW Hub API timestamps instead of marker tones. Kept for --legacy mode
compatibility. See PLAN.md for details.

Takes marker tone timestamps and splits all player audio tracks into
per-map segments. Also supports manual splitting via a splits JSON file.

Usage:
    python src/processing/audio_splitter.py <craig_dir> <output_dir> [--manual splits.json]
"""

import sys
import json
import shutil
from pathlib import Path
from pydub import AudioSegment

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.utils.audio_utils import load_config, ensure_dir, get_player_name
from src.processing.tone_detector import detect_markers


def pair_markers(markers: list[dict]) -> list[dict]:
    """Pair start/end markers into map segments.

    Returns:
        List of segments: [{"start": 12.5, "end": 1232.1, "index": 0}, ...]
    """
    segments = []
    current_start = None

    for m in markers:
        if m["type"] == "start":
            current_start = m["time"]
        elif m["type"] == "end" and current_start is not None:
            segments.append({
                "start": current_start,
                "end": m["time"],
                "index": len(segments),
            })
            current_start = None

    # Handle unclosed segment (match started but no end marker)
    if current_start is not None:
        segments.append({
            "start": current_start,
            "end": None,  # Will use end of file
            "index": len(segments),
        })

    return segments


def split_audio(
    craig_dir: str,
    output_dir: str,
    segments: list[dict] | None = None,
    manual_splits: str | None = None,
    map_names: list[str] | None = None,
) -> list[dict]:
    """Split all player tracks by map segments.

    Args:
        craig_dir: Directory containing Craig FLAC exports.
        output_dir: Base output directory.
        segments: Pre-computed segments from marker detection.
        manual_splits: Path to manual splits JSON file.
        map_names: Optional list of map names for each segment.

    Returns:
        List of segment metadata dicts.
    """
    craig_path = Path(craig_dir)
    output_path = Path(output_dir)

    # Find all FLAC files
    flac_files = sorted(craig_path.glob("*.flac"))
    if not flac_files:
        print(f"No FLAC files found in {craig_dir}")
        return []

    # Get segments from markers or manual splits
    if segments is None:
        if manual_splits:
            with open(manual_splits) as f:
                segments = json.load(f)
        else:
            # Auto-detect from first player track (markers are on one track)
            print(f"Detecting markers in {flac_files[0]}...")
            markers = detect_markers(str(flac_files[0]))
            segments = pair_markers(markers)

    if not segments:
        # No markers found - treat entire recording as one segment
        print("No markers found. Treating entire recording as one segment.")
        segments = [{"start": 0, "end": None, "index": 0}]

    # Split each segment
    result = []
    for seg in segments:
        seg_idx = seg["index"]
        map_name = map_names[seg_idx] if map_names and seg_idx < len(map_names) else f"map_{seg_idx + 1:03d}"
        seg_dir = ensure_dir(output_path / f"{map_name}_{seg_idx + 1:03d}" / "audio")

        seg_meta = {
            "index": seg_idx,
            "map": map_name,
            "start_time": seg["start"],
            "end_time": seg["end"],
            "players": [],
            "audio_dir": str(seg_dir),
        }

        for flac_file in flac_files:
            player_name = get_player_name(flac_file.name)
            print(f"  Splitting {player_name} for {map_name}...")

            audio = AudioSegment.from_file(str(flac_file))

            start_ms = int(seg["start"] * 1000)
            end_ms = int(seg["end"] * 1000) if seg["end"] else len(audio)

            segment_audio = audio[start_ms:end_ms]

            out_file = seg_dir / f"{player_name}.flac"
            segment_audio.export(str(out_file), format="flac")

            seg_meta["players"].append({
                "name": player_name,
                "audio_file": str(out_file),
                "duration": len(segment_audio) / 1000.0,
            })

        result.append(seg_meta)

    return result


def main():
    """CLI entrypoint."""
    if len(sys.argv) < 3:
        print("Usage: python audio_splitter.py <craig_dir> <output_dir> [--manual splits.json] [--maps dm3,e1m2]")
        sys.exit(1)

    craig_dir = sys.argv[1]
    output_dir = sys.argv[2]

    manual_splits = None
    map_names = None

    i = 3
    while i < len(sys.argv):
        if sys.argv[i] == "--manual" and i + 1 < len(sys.argv):
            manual_splits = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--maps" and i + 1 < len(sys.argv):
            map_names = sys.argv[i + 1].split(",")
            i += 2
        else:
            i += 1

    segments = split_audio(craig_dir, output_dir, manual_splits=manual_splits, map_names=map_names)

    # Write metadata
    meta_path = Path(output_dir) / "split_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(segments, f, indent=2)
    print(f"\nSplit metadata written to {meta_path}")
    print(f"Created {len(segments)} map segment(s)")


if __name__ == "__main__":
    main()
