"""Main pipeline orchestrator.

Processes a Craig recording export through the full pipeline:
  [1/6] Parse Craig export
  [2/6] Query QW Hub API for matches
  [3/6] Pair matches to recording & fetch ktxstats
  [4/6] Split audio by match timestamps
  [5/6] Transcribe each player track
  [6/6] Run Claude analysis (enriched with match data)

Usage:
    python src/pipeline.py <craig_zip_or_dir> [options]

    Options:
        --maps dm3,e1m2          Override map names
        --manual splits.json     Manual split timestamps (legacy)
        --skip-analysis          Skip Claude analysis step
        --skip-api               Skip QW Hub API query
        --player-query NAME      Override player search term (default from config)
        --output-dir DIR         Override output directory
        --intermissions           Extract intermission audio (pre/post game, gaps)
        --legacy                 Use old tone-detection pipeline
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.audio_utils import load_config, ensure_dir, get_audio_duration
from src.processing.craig_parser import parse_craig_export
from src.processing.transcriber import transcribe_directory
from src.processing.timeline_merger import merge_transcripts, detect_overlaps, compute_stats


def run_pipeline(
    source: str,
    output_dir: str | None = None,
    map_names: list[str] | None = None,
    manual_splits: str | None = None,
    skip_analysis: bool = False,
    skip_transcription: bool = False,
    skip_api: bool = False,
    player_query: str | None = None,
    legacy: bool = False,
    intermissions: bool = False,
):
    """Run the full processing pipeline.

    Args:
        source: Path to Craig zip export or extracted directory.
        output_dir: Output directory. Defaults to processed/{date}/.
        map_names: Optional list of map names for each segment.
        manual_splits: Path to manual splits JSON.
        skip_analysis: Skip Claude analysis step.
        skip_transcription: Skip Whisper transcription and timeline merge.
        skip_api: Skip QW Hub API query.
        player_query: Override player search term.
        legacy: Use old tone-detection pipeline.
        intermissions: Extract intermission audio (pre/post game, gaps between maps).
    """
    config = load_config()
    project_root = Path(__file__).parent.parent

    # Determine output directory
    # Match folders (e.g., 2026-02-01_]sr[_vs_red_dm4_01/) are created
    # inside this directory by the timestamp splitter
    if output_dir is None:
        output_dir = str(project_root / "processed")
    output_path = ensure_dir(output_dir)

    print(f"Output directory: {output_path}")
    print("=" * 60)

    # Legacy mode: use old tone-detection pipeline
    if legacy:
        _run_legacy_pipeline(source, output_path, config, map_names, manual_splits, skip_analysis)
        return

    # =========================================================================
    # [1/6] Parse Craig export
    # =========================================================================
    print("\n[1/6] Parsing Craig export...")
    craig_session = parse_craig_export(source)
    print(f"  Start time: {craig_session.start_time.isoformat()}")
    print(f"  Recording ID: {craig_session.recording_id}")
    print(f"  Tracks ({len(craig_session.tracks)}):")
    for t in craig_session.tracks:
        suffix = f" -> {t.audio_path.name}" if t.audio_path else " (no audio)"
        print(f"    {t.track_number}: {t.discord_username} ({t.discord_display_name}){suffix}")

    # Get recording duration from longest track
    recording_duration = 0.0
    for track in craig_session.tracks:
        if track.audio_path and track.audio_path.exists():
            dur = get_audio_duration(track.audio_path)
            track.duration_seconds = dur
            recording_duration = max(recording_duration, dur)
    print(f"  Recording duration: {recording_duration:.1f}s ({recording_duration / 60:.1f}min)")

    # =========================================================================
    # [2/6] Query QW Hub API for matches
    # =========================================================================
    hub_matches = []
    if not skip_api:
        print("\n[2/6] Querying QW Hub API...")
        try:
            from src.api.qwhub_client import QWHubClient

            team_config = config.get("team", {})
            query = player_query or team_config.get("player_query", "")

            with QWHubClient(config) as client:
                hub_matches = client.find_matches_for_session(
                    craig_start=craig_session.start_time.isoformat(),
                    craig_duration_seconds=recording_duration,
                    player_query=query or None,
                )
            print(f"  Found {len(hub_matches)} match(es) in time window")
            for m in hub_matches:
                teams = " vs ".join(
                    f"{t.get('name', '?')} ({t.get('frags', '?')})"
                    for t in m.get("teams", [])
                )
                print(f"    {m.get('map', '?')} - {teams} @ {m.get('timestamp', '?')}")
        except Exception as e:
            print(f"  API query failed: {e}")
            print("  Falling back to no-API mode")
    else:
        print("\n[2/6] Skipping QW Hub API (--skip-api)")

    # =========================================================================
    # [3/6] Pair matches & fetch ktxstats
    # =========================================================================
    pairings = []
    if hub_matches:
        print("\n[3/6] Pairing matches to recording & fetching ktxstats...")
        from src.api.qwhub_client import QWHubClient
        from src.processing.match_pairer import pair_matches, format_pairing_summary

        pairing_config = config.get("pairing", {})

        # Fetch ktxstats for each match
        ktxstats_map = {}
        try:
            with QWHubClient(config) as client:
                for m in hub_matches:
                    sha = m.get("demo_sha256", "")
                    if sha:
                        stats = client.fetch_ktxstats(sha)
                        if stats:
                            ktxstats_map[sha] = stats
                            print(f"  ktxstats: {m.get('map', '?')} - duration={stats.get('duration', '?')}s")
        except Exception as e:
            print(f"  ktxstats fetch failed: {e}")

        pairings = pair_matches(
            craig_session=craig_session,
            hub_matches=hub_matches,
            ktxstats_map=ktxstats_map,
            clock_tolerance_seconds=pairing_config.get("clock_tolerance_seconds", 5.0),
            padding_seconds=pairing_config.get("padding_seconds", 10.0),
            default_duration=pairing_config.get("default_duration_seconds", 1200),
        )

        # Filter by minimum confidence
        min_conf = pairing_config.get("min_confidence", 0.3)
        pairings = [p for p in pairings if p.confidence >= min_conf]

        print(format_pairing_summary(pairings))
    else:
        print("\n[3/6] No matches to pair")

    # =========================================================================
    # [4/6] Split audio
    # =========================================================================
    print("\n[4/6] Splitting audio by match timestamps...")
    segments = []

    if pairings:
        from src.processing.timestamp_splitter import split_by_timestamps

        team_config = config.get("team", {})
        name_map = team_config.get("player_name_map", {})

        segments = split_by_timestamps(
            craig_session=craig_session,
            pairings=pairings,
            output_dir=output_path,
            player_name_map=name_map,
        )
        print(f"  Split {len(segments)} segment(s)")
    elif map_names:
        # Fallback: no API matches, but user specified maps
        # Treat entire recording as segments (one per map name)
        print("  No API matches - using entire recording per map")
        from src.processing.timestamp_splitter import split_by_timestamps
        from src.processing.match_pairer import MatchPairing
        from datetime import timezone

        team_config = config.get("team", {})
        name_map = team_config.get("player_name_map", {})
        pairing_config = config.get("pairing", {})
        padding = pairing_config.get("padding_seconds", 10.0)

        # Create a single pairing spanning the full recording for each map
        fallback_pairings = []
        for i, map_name in enumerate(map_names):
            fallback_pairings.append(MatchPairing(
                match_id=0,
                map_name=map_name,
                timestamp=craig_session.start_time,
                server_hostname="",
                duration_seconds=recording_duration,
                audio_offset_seconds=0.0,
                audio_end_seconds=recording_duration,
                confidence=0.0,
                confidence_reasons=["fallback: no API matches, user-specified map"],
            ))

        segments = split_by_timestamps(
            craig_session=craig_session,
            pairings=fallback_pairings,
            output_dir=output_path,
            player_name_map=name_map,
        )
        print(f"  Created {len(segments)} fallback segment(s)")
    else:
        # Last fallback: entire recording as a single "unknown" segment
        print("  No matches and no maps specified - using entire recording")
        from src.processing.timestamp_splitter import split_by_timestamps
        from src.processing.match_pairer import MatchPairing

        team_config = config.get("team", {})
        name_map = team_config.get("player_name_map", {})

        fallback_pairings = [MatchPairing(
            match_id=0,
            map_name="unknown",
            timestamp=craig_session.start_time,
            server_hostname="",
            duration_seconds=recording_duration,
            audio_offset_seconds=0.0,
            audio_end_seconds=recording_duration,
            confidence=0.0,
            confidence_reasons=["fallback: entire recording as single segment"],
        )]

        segments = split_by_timestamps(
            craig_session=craig_session,
            pairings=fallback_pairings,
            output_dir=output_path,
            player_name_map=name_map,
        )

    # Extract intermission audio (gaps between matches) - opt-in via --intermissions
    intermission_segments = []
    if intermissions and pairings and len(pairings) > 0:
        from src.processing.timestamp_splitter import extract_intermissions

        team_config = config.get("team", {})
        name_map = team_config.get("player_name_map", {})

        intermission_segments = extract_intermissions(
            craig_session=craig_session,
            pairings=pairings,
            output_dir=output_path,
            player_name_map=name_map,
            min_gap_seconds=30.0,
        )
        if intermission_segments:
            print(f"  Extracted {len(intermission_segments)} intermission segment(s):")
            for im in intermission_segments:
                print(f"    - {im['label']} ({im['duration']:.0f}s)")

    # Combine match segments + intermission segments for transcription
    all_segments = segments + intermission_segments

    # =========================================================================
    # [5/6] Transcribe
    # =========================================================================
    if skip_transcription:
        print("\n[5/6] Skipping transcription (--skip-transcription)")
    else:
        print("\n[5/6] Transcribing audio...")
        for seg_meta in all_segments:
            audio_dir = seg_meta["audio_dir"]
            map_name = seg_meta["map"]
            label = seg_meta.get("label", map_name)
            print(f"\n  --- {label} ---")

            # Intermissions use generic prompt (no map-specific terms)
            whisper_map = "" if seg_meta.get("is_intermission") else map_name
            transcripts = transcribe_directory(audio_dir, config, map_name=whisper_map)

            # Write per-player transcripts
            transcripts_dir = ensure_dir(Path(audio_dir).parent / "transcripts")
            for player_name, segs in transcripts.items():
                out_path = transcripts_dir / f"{player_name}.json"
                with open(out_path, "w") as f:
                    json.dump(segs, f, indent=2)

            # Merge timeline
            timeline = merge_transcripts(transcripts)
            overlaps = detect_overlaps(timeline)

            total_duration = None
            if seg_meta.get("players"):
                total_duration = max(p["duration"] for p in seg_meta["players"])
            stats = compute_stats(timeline, total_duration)

            with open(transcripts_dir / "merged_timeline.json", "w") as f:
                json.dump(timeline, f, indent=2)
            with open(transcripts_dir / "overlaps.json", "w") as f:
                json.dump(overlaps, f, indent=2)
            with open(transcripts_dir / "stats.json", "w") as f:
                json.dump(stats, f, indent=2)

            print(f"  Timeline: {len(timeline)} entries, {len(overlaps)} overlaps")

    # =========================================================================
    # [6/6] Analysis
    # =========================================================================
    if skip_analysis or skip_transcription:
        print("\n[6/6] Skipping analysis (--skip-analysis)" if skip_analysis
              else "\n[6/6] Skipping analysis (no transcripts)")
    else:
        print("\n[6/6] Running Claude analysis...")
        try:
            from src.analysis.analyzer import analyze_map

            # Collect intermission transcripts to pass as context
            intermission_timelines = {}
            for im_meta in intermission_segments:
                im_timeline_path = Path(im_meta["audio_dir"]).parent / "transcripts" / "merged_timeline.json"
                if im_timeline_path.exists():
                    with open(im_timeline_path) as f:
                        intermission_timelines[im_meta.get("label", "intermission")] = json.load(f)

            for seg_meta in segments:
                map_dir = Path(seg_meta["audio_dir"]).parent
                print(f"\n  --- Analyzing {seg_meta['map']} ---")
                analyze_map(str(map_dir), config, intermission_context=intermission_timelines)
        except Exception as e:
            print(f"  Analysis failed: {e}")
            print("  (Set ANTHROPIC_API_KEY to enable analysis)")

    # Summary
    print("\n" + "=" * 60)
    print("Pipeline complete!")
    print(f"Output: {output_path}")
    for seg_meta in segments:
        map_dir = Path(seg_meta["audio_dir"]).parent
        print(f"  {seg_meta['map']}/")
        print(f"    audio/       - Split player tracks")
        print(f"    transcripts/ - Whisper transcripts + merged timeline")
        if not skip_analysis and (map_dir / "analysis" / "report.md").exists():
            print(f"    analysis/    - Claude communication report")


def _run_legacy_pipeline(
    source: str,
    output_path: Path,
    config: dict,
    map_names: list[str] | None,
    manual_splits: str | None,
    skip_analysis: bool,
):
    """Run the old tone-detection based pipeline (--legacy mode)."""
    from src.processing.tone_detector import detect_markers
    from src.processing.audio_splitter import split_audio, pair_markers

    # Step 1: Extract
    print("\n[1/5] Extracting Craig export... (legacy mode)")
    craig_dir = _extract_craig_legacy(source, str(output_path))
    audio_files = sorted(craig_dir.glob("*.flac")) + sorted(craig_dir.glob("*.ogg"))
    print(f"  Found {len(audio_files)} audio tracks:")
    for f in audio_files:
        print(f"    - {f.name}")

    # Step 2: Detect markers
    print("\n[2/5] Detecting marker tones...")
    segments_raw = None
    if manual_splits:
        print(f"  Using manual splits from {manual_splits}")
        with open(manual_splits) as f:
            segments_raw = json.load(f)
    else:
        if audio_files:
            markers = detect_markers(str(audio_files[0]), config)
            segments_raw = pair_markers(markers)
            if segments_raw:
                print(f"  Found {len(segments_raw)} map segment(s)")
                for seg in segments_raw:
                    end_str = f"{seg['end']:.1f}s" if seg['end'] else "EOF"
                    print(f"    Map {seg['index'] + 1}: {seg['start']:.1f}s - {end_str}")
            else:
                print("  No markers found - treating as single segment")

    # Step 3: Split audio
    print("\n[3/5] Splitting audio by map...")
    split_result = split_audio(
        str(craig_dir), str(output_path), segments=segments_raw, map_names=map_names,
    )

    # Step 4: Transcribe
    print("\n[4/5] Transcribing audio...")
    for seg_meta in split_result:
        audio_dir = seg_meta["audio_dir"]
        print(f"\n  --- {seg_meta['map']} ---")

        transcripts = transcribe_directory(audio_dir, config, map_name=seg_meta.get("map", ""))

        transcripts_dir = ensure_dir(Path(audio_dir).parent / "transcripts")
        for player_name, segs in transcripts.items():
            out_path = transcripts_dir / f"{player_name}.json"
            with open(out_path, "w") as f:
                json.dump(segs, f, indent=2)

        timeline = merge_transcripts(transcripts)
        overlaps = detect_overlaps(timeline)

        total_duration = None
        if seg_meta.get("players"):
            total_duration = max(p["duration"] for p in seg_meta["players"])
        stats = compute_stats(timeline, total_duration)

        with open(transcripts_dir / "merged_timeline.json", "w") as f:
            json.dump(timeline, f, indent=2)
        with open(transcripts_dir / "overlaps.json", "w") as f:
            json.dump(overlaps, f, indent=2)
        with open(transcripts_dir / "stats.json", "w") as f:
            json.dump(stats, f, indent=2)

        print(f"  Timeline: {len(timeline)} entries, {len(overlaps)} overlaps")

        meta_path = Path(audio_dir).parent / "metadata.json"
        with open(meta_path, "w") as f:
            json.dump(seg_meta, f, indent=2)

    # Step 5: Analysis
    if skip_analysis:
        print("\n[5/5] Skipping analysis (--skip-analysis)")
    else:
        print("\n[5/5] Running Claude analysis...")
        try:
            from src.analysis.analyzer import analyze_map

            for seg_meta in split_result:
                map_dir = Path(seg_meta["audio_dir"]).parent
                print(f"\n  --- Analyzing {seg_meta['map']} ---")
                analyze_map(str(map_dir), config)
        except Exception as e:
            print(f"  Analysis failed: {e}")

    print("\n" + "=" * 60)
    print("Pipeline complete! (legacy mode)")
    print(f"Output: {output_path}")


def _extract_craig_legacy(source: str, work_dir: str) -> Path:
    """Extract Craig zip or use directory directly (legacy)."""
    import zipfile

    source_path = Path(source)
    work_path = Path(work_dir)

    if source_path.is_dir():
        return source_path

    if source_path.suffix == ".zip":
        extract_dir = ensure_dir(work_path / "craig_extracted")
        print(f"Extracting {source_path.name}...")
        with zipfile.ZipFile(source_path) as zf:
            zf.extractall(extract_dir)
        subdirs = [d for d in extract_dir.iterdir() if d.is_dir()]
        has_audio = list(extract_dir.glob("*.flac")) or list(extract_dir.glob("*.ogg"))
        if len(subdirs) == 1 and not has_audio:
            return subdirs[0]
        return extract_dir

    raise ValueError(f"Unsupported source: {source}. Provide a .zip file or directory.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    source = sys.argv[1]
    map_names = None
    manual_splits = None
    skip_analysis = False
    skip_transcription = False
    skip_api = False
    player_query = None
    output_dir = None
    legacy = False
    intermissions = False

    i = 2
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == "--maps" and i + 1 < len(sys.argv):
            map_names = sys.argv[i + 1].split(",")
            i += 2
        elif arg == "--manual" and i + 1 < len(sys.argv):
            manual_splits = sys.argv[i + 1]
            i += 2
        elif arg == "--skip-analysis":
            skip_analysis = True
            i += 1
        elif arg == "--skip-transcription":
            skip_transcription = True
            i += 1
        elif arg == "--skip-api":
            skip_api = True
            i += 1
        elif arg == "--player-query" and i + 1 < len(sys.argv):
            player_query = sys.argv[i + 1]
            i += 2
        elif arg == "--output-dir" and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
            i += 2
        elif arg == "--intermissions":
            intermissions = True
            i += 1
        elif arg == "--legacy":
            legacy = True
            i += 1
        else:
            print(f"Unknown option: {arg}")
            i += 1

    run_pipeline(
        source=source,
        output_dir=output_dir,
        map_names=map_names,
        manual_splits=manual_splits,
        skip_analysis=skip_analysis,
        skip_transcription=skip_transcription,
        skip_api=skip_api,
        player_query=player_query,
        legacy=legacy,
        intermissions=intermissions,
    )


if __name__ == "__main__":
    main()
