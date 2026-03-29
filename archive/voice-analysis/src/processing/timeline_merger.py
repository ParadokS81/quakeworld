"""Merge per-player transcripts into a unified chronological timeline.

The timeline is the central data format - all analysis reads from it.

Usage:
    python src/processing/timeline_merger.py <transcripts_dir>
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.utils.audio_utils import ensure_dir


def merge_transcripts(transcripts: dict[str, list[dict]]) -> list[dict]:
    """Merge per-player transcripts into chronological timeline.

    Args:
        transcripts: Dict mapping player name to transcript segments.

    Returns:
        Unified timeline sorted by start time:
        [
            {"speaker": "ParadokS", "start": 1.2, "end": 2.8, "text": "quad soon", ...},
            {"speaker": "Razor", "start": 1.5, "end": 3.1, "text": "im dead", ...},
        ]
    """
    timeline = []

    for player_name, segments in transcripts.items():
        for seg in segments:
            entry = {
                "speaker": player_name,
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"],
                "confidence": seg.get("confidence"),
            }
            timeline.append(entry)

    # Sort by start time, then by speaker name for stable ordering
    timeline.sort(key=lambda e: (e["start"], e["speaker"]))

    return timeline


def detect_overlaps(timeline: list[dict]) -> list[dict]:
    """Detect overlapping speech between different speakers.

    Returns list of overlap events for analysis.
    """
    overlaps = []

    for i, entry_a in enumerate(timeline):
        for j in range(i + 1, len(timeline)):
            entry_b = timeline[j]

            # Stop checking once we're past possible overlap
            if entry_b["start"] >= entry_a["end"]:
                break

            if entry_a["speaker"] == entry_b["speaker"]:
                continue

            overlap_start = max(entry_a["start"], entry_b["start"])
            overlap_end = min(entry_a["end"], entry_b["end"])
            overlap_duration = overlap_end - overlap_start

            if overlap_duration > 0.1:  # Ignore tiny overlaps < 100ms
                overlaps.append({
                    "speakers": sorted([entry_a["speaker"], entry_b["speaker"]]),
                    "start": round(overlap_start, 3),
                    "end": round(overlap_end, 3),
                    "duration": round(overlap_duration, 3),
                    "texts": {
                        entry_a["speaker"]: entry_a["text"],
                        entry_b["speaker"]: entry_b["text"],
                    },
                })

    return overlaps


def compute_stats(timeline: list[dict], total_duration: float | None = None) -> dict:
    """Compute per-player communication statistics."""
    speakers = {}

    for entry in timeline:
        name = entry["speaker"]
        if name not in speakers:
            speakers[name] = {
                "segments": 0,
                "total_speaking_time": 0.0,
                "total_words": 0,
            }

        s = speakers[name]
        s["segments"] += 1
        s["total_speaking_time"] += entry["end"] - entry["start"]
        s["total_words"] += len(entry["text"].split())

    player_stats = {}
    total_speaking = 0.0
    total_segments = 0

    for name, data in speakers.items():
        avg_length = data["total_speaking_time"] / data["segments"] if data["segments"] else 0
        player_stats[name] = {
            "segments": data["segments"],
            "total_speaking_time": round(data["total_speaking_time"], 2),
            "total_words": data["total_words"],
            "avg_segment_duration": round(avg_length, 2),
            "words_per_minute": round(data["total_words"] / (data["total_speaking_time"] / 60), 1)
            if data["total_speaking_time"] > 0 else 0,
        }
        total_speaking += data["total_speaking_time"]
        total_segments += data["segments"]

    stats = {
        "player_stats": player_stats,
        "team": {
            "total_segments": total_segments,
            "total_speaking_time": round(total_speaking, 2),
            "player_count": len(speakers),
        },
    }

    if total_duration:
        stats["team"]["total_duration"] = total_duration
        stats["team"]["silence_percentage"] = round(
            (1 - total_speaking / (total_duration * len(speakers))) * 100, 1
        )

    return stats


def main():
    """CLI entrypoint."""
    if len(sys.argv) < 2:
        print("Usage: python timeline_merger.py <transcripts_dir>")
        sys.exit(1)

    transcripts_dir = Path(sys.argv[1])

    # Load per-player transcripts
    transcripts = {}
    for json_file in sorted(transcripts_dir.glob("*.json")):
        if json_file.name.startswith("merged_") or json_file.name.startswith("stats") or json_file.name == "overlaps.json":
            continue
        player_name = json_file.stem
        with open(json_file) as f:
            transcripts[player_name] = json.load(f)

    if not transcripts:
        print(f"No transcript files found in {transcripts_dir}")
        sys.exit(1)

    timeline = merge_transcripts(transcripts)
    overlaps = detect_overlaps(timeline)
    stats = compute_stats(timeline)

    # Write outputs
    out_timeline = transcripts_dir / "merged_timeline.json"
    with open(out_timeline, "w") as f:
        json.dump(timeline, f, indent=2)
    print(f"Timeline: {out_timeline} ({len(timeline)} entries)")

    out_overlaps = transcripts_dir / "overlaps.json"
    with open(out_overlaps, "w") as f:
        json.dump(overlaps, f, indent=2)
    print(f"Overlaps: {out_overlaps} ({len(overlaps)} events)")

    out_stats = transcripts_dir / "stats.json"
    with open(out_stats, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Stats: {out_stats}")

    # Print summary
    print(f"\n{'Player':<15s} {'Segs':>5s} {'Time':>7s} {'Words':>6s} {'WPM':>5s}")
    print("-" * 40)
    for name, ps in stats["player_stats"].items():
        print(f"{name:<15s} {ps['segments']:>5d} {ps['total_speaking_time']:>6.1f}s {ps['total_words']:>6d} {ps['words_per_minute']:>5.1f}")


if __name__ == "__main__":
    main()
