"""LEGACY: Detect marker tones in audio files using FFT analysis.

NOTE: This module is superseded by the timestamp-based pipeline
(craig_parser.py + match_pairer.py + timestamp_splitter.py).
Kept for --legacy mode compatibility. See PLAN.md for details.

Scans audio for 18kHz (match start) and 17.5kHz (match end) tones
to determine match boundaries within a Craig recording session.

Usage:
    python src/processing/tone_detector.py path/to/audio.flac

    From code:
        from src.processing.tone_detector import detect_markers
        markers = detect_markers("path/to/audio.flac")
"""

import sys
import json
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import stft

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.utils.audio_utils import load_config


def detect_markers(audio_path: str, config: dict | None = None) -> list[dict]:
    """Detect marker tones in an audio file.

    Args:
        audio_path: Path to FLAC/WAV audio file.
        config: Pipeline config dict. Loaded from settings.yaml if None.

    Returns:
        List of marker events, sorted by time:
        [
            {"type": "start", "time": 12.5},
            {"type": "end", "time": 1232.1},
            {"type": "start", "time": 1280.3},
            {"type": "end", "time": 2512.7},
        ]
    """
    if config is None:
        config = load_config()

    mc = config["markers"]
    start_freq = mc["start_frequency"]
    end_freq = mc["end_frequency"]
    threshold = mc["detection_threshold"]
    window_size = mc["window_size"]
    hop_size = mc["hop_size"]

    # Read audio file
    # pydub handles FLAC → raw samples
    from pydub import AudioSegment

    audio = AudioSegment.from_file(audio_path)
    sample_rate = audio.frame_rate
    samples = np.array(audio.get_array_of_samples(), dtype=np.float32)

    # If stereo, take first channel
    if audio.channels > 1:
        samples = samples[::audio.channels]

    # Normalize to -1..1
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    # Compute STFT
    freqs, times, Zxx = stft(
        samples,
        fs=sample_rate,
        nperseg=window_size,
        noverlap=window_size - hop_size,
    )

    magnitude = np.abs(Zxx)

    # Find frequency bin indices for our marker tones
    freq_resolution = freqs[1] - freqs[0]
    start_bin = int(round(start_freq / freq_resolution))
    end_bin = int(round(end_freq / freq_resolution))

    # Tolerance: check +/- 1 bin
    def get_band_energy(bin_idx: int) -> np.ndarray:
        lo = max(0, bin_idx - 1)
        hi = min(len(freqs) - 1, bin_idx + 1)
        return magnitude[lo:hi + 1].max(axis=0)

    start_energy = get_band_energy(start_bin)
    end_energy = get_band_energy(end_bin)

    # Normalize energies relative to overall spectrum energy per frame
    total_energy = magnitude.sum(axis=0) + 1e-10
    start_ratio = start_energy / total_energy
    end_ratio = end_energy / total_energy

    # Detect peaks above threshold
    markers = []

    # Find contiguous regions above threshold, take the midpoint
    def find_tone_events(ratio: np.ndarray, tone_type: str, min_gap: float = 5.0):
        """Find tone events from energy ratio signal."""
        above = ratio > threshold
        events = []
        in_event = False
        event_start = 0

        for i, val in enumerate(above):
            if val and not in_event:
                in_event = True
                event_start = i
            elif not val and in_event:
                in_event = False
                # Take midpoint of the event
                mid = (event_start + i) // 2
                event_time = float(times[mid])

                # Skip if too close to previous event of same type
                if events and (event_time - events[-1]) < min_gap:
                    continue
                events.append(event_time)

        # Handle event at end of file
        if in_event:
            mid = (event_start + len(above) - 1) // 2
            events.append(float(times[mid]))

        return [{"type": tone_type, "time": t} for t in events]

    markers.extend(find_tone_events(start_ratio, "start"))
    markers.extend(find_tone_events(end_ratio, "end"))

    # Sort by time
    markers.sort(key=lambda m: m["time"])

    return markers


def main():
    """CLI entrypoint for tone detection."""
    if len(sys.argv) < 2:
        print("Usage: python tone_detector.py <audio_file>")
        sys.exit(1)

    audio_path = sys.argv[1]
    print(f"Scanning {audio_path} for marker tones...")

    markers = detect_markers(audio_path)

    if not markers:
        print("No markers found.")
    else:
        print(f"Found {len(markers)} markers:")
        for m in markers:
            mins = int(m["time"] // 60)
            secs = m["time"] % 60
            print(f"  {m['type']:>5s} @ {mins:02d}:{secs:05.2f} ({m['time']:.2f}s)")

    # Also output as JSON for pipeline consumption
    json_path = Path(audio_path).with_suffix(".markers.json")
    with open(json_path, "w") as f:
        json.dump(markers, f, indent=2)
    print(f"Markers written to {json_path}")


if __name__ == "__main__":
    main()
