"""Transcribe player audio tracks using faster-whisper.

Processes each player's FLAC file independently and outputs
timestamped transcript segments per player.

Usage:
    python src/processing/transcriber.py <audio_dir>
"""

import sys
import json
from pathlib import Path
from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.utils.audio_utils import load_config, ensure_dir, get_player_name, build_whisper_prompt


def transcribe_track(
    audio_path: str,
    model: WhisperModel,
    language: str = "en",
    initial_prompt: str = "",
    silence_gap_ms: int = 800,
) -> list[dict]:
    """Transcribe a single player audio track.

    Uses word-level timestamps to split whisper's long segments into
    individual callout-sized chunks based on silence gaps between words.

    Args:
        audio_path: Path to FLAC audio file.
        model: Loaded WhisperModel instance.
        language: Language code.
        initial_prompt: Optional prompt to bias Whisper toward expected vocabulary.
        silence_gap_ms: Minimum silence gap (ms) between words to split segments.

    Returns:
        List of transcript segments:
        [{"start": 1.2, "end": 2.8, "text": "quad soon", "confidence": 0.95}, ...]
    """
    transcribe_kwargs = dict(
        language=language,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=300,
            speech_pad_ms=200,
        ),
        word_timestamps=True,
    )
    if initial_prompt:
        transcribe_kwargs["initial_prompt"] = initial_prompt

    segments, info = model.transcribe(audio_path, **transcribe_kwargs)

    # Collect all words with timestamps, then re-segment by silence gaps
    results = []
    for seg in segments:
        if not seg.words:
            # Fallback: no word timestamps, use segment as-is
            text = seg.text.strip()
            if text:
                results.append({
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": text,
                    "confidence": round(seg.avg_logprob, 4),
                })
            continue

        # Re-segment based on silence gaps between words
        current_words = []
        for word in seg.words:
            if current_words:
                gap_ms = (word.start - current_words[-1].end) * 1000
                if gap_ms >= silence_gap_ms:
                    # Flush current segment
                    _flush_word_segment(current_words, seg.avg_logprob, results)
                    current_words = []
            current_words.append(word)

        if current_words:
            _flush_word_segment(current_words, seg.avg_logprob, results)

    return results


def _flush_word_segment(words: list, avg_logprob: float, results: list[dict]):
    """Flush accumulated words into a segment."""
    text = "".join(w.word for w in words).strip()
    if not text:
        return
    results.append({
        "start": round(words[0].start, 3),
        "end": round(words[-1].end, 3),
        "text": text,
        "confidence": round(avg_logprob, 4),
    })


def transcribe_directory(
    audio_dir: str,
    config: dict | None = None,
    map_name: str = "",
) -> dict[str, list[dict]]:
    """Transcribe all player tracks in a directory.

    Args:
        audio_dir: Directory containing player FLAC files.
        config: Pipeline config. Loaded from settings.yaml if None.
        map_name: Optional map name to include map-specific terms in prompt.

    Returns:
        Dict mapping player name to transcript segments:
        {"ParadokS": [...], "Razor": [...], ...}
    """
    if config is None:
        config = load_config()

    wc = config["whisper"]

    print(f"Loading Whisper model '{wc['model']}' ({wc['compute_type']} on {wc['device']})...")
    model = WhisperModel(
        wc["model"],
        device=wc["device"],
        compute_type=wc["compute_type"],
    )

    # Build initial_prompt from QW glossary
    initial_prompt = build_whisper_prompt(map_name)
    if initial_prompt:
        prompt_preview = initial_prompt[:80] + "..." if len(initial_prompt) > 80 else initial_prompt
        print(f"Whisper prompt ({len(initial_prompt)} chars, map={map_name or 'generic'}): {prompt_preview}")

    audio_path = Path(audio_dir)
    audio_files = sorted(audio_path.glob("*.flac")) + sorted(audio_path.glob("*.ogg"))

    if not audio_files:
        print(f"No audio files (FLAC/OGG) found in {audio_dir}")
        return {}

    transcripts = {}
    for audio_file in audio_files:
        player_name = get_player_name(audio_file.name)
        print(f"Transcribing {player_name} ({audio_file.suffix})...")

        segments = transcribe_track(
            str(audio_file), model, language=wc["language"], initial_prompt=initial_prompt,
        )
        transcripts[player_name] = segments

        word_count = sum(len(s["text"].split()) for s in segments)
        print(f"  {len(segments)} segments, {word_count} words")

    return transcripts


def main():
    """CLI entrypoint."""
    if len(sys.argv) < 2:
        print("Usage: python transcriber.py <audio_dir> [--map MAP_NAME]")
        sys.exit(1)

    audio_dir = sys.argv[1]
    map_name = ""
    if "--map" in sys.argv:
        idx = sys.argv.index("--map")
        if idx + 1 < len(sys.argv):
            map_name = sys.argv[idx + 1]

    transcripts = transcribe_directory(audio_dir, map_name=map_name)

    # Write per-player transcripts
    output_dir = ensure_dir(Path(audio_dir).parent / "transcripts")
    for player_name, segments in transcripts.items():
        out_path = output_dir / f"{player_name}.json"
        with open(out_path, "w") as f:
            json.dump(segments, f, indent=2)
        print(f"Written {out_path}")

    print(f"\nTranscribed {len(transcripts)} player(s)")


if __name__ == "__main__":
    main()
