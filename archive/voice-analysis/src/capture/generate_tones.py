"""LEGACY: Generate inaudible marker tones for match start/end detection.

NOTE: Marker tones are no longer needed. The new pipeline uses QW Hub API
timestamps to split audio. This module and the markers/ directory are kept
for reference. See PLAN.md for details.

Creates 18kHz (start) and 17.5kHz (end) sine wave WAV files.
These frequencies are above most adults' hearing range but are
captured perfectly by FLAC recording at 48kHz sample rate.

Usage:
    python src/capture/generate_tones.py

Output:
    markers/tones/match_start.wav
    markers/tones/match_end.wav
"""

import numpy as np
import os
from scipy.io import wavfile

# Tone parameters
SAMPLE_RATE = 48000
DURATION = 0.15  # 150ms
AMPLITUDE = 0.3  # 30% volume - enough for FFT detection, quiet if somehow heard

TONES = {
    "match_start": 18000,  # 18kHz
    "match_end": 17500,    # 17.5kHz
}

# Fade in/out to avoid click artifacts (5ms each)
FADE_MS = 5


def generate_tone(frequency: float, duration: float, sample_rate: int, amplitude: float) -> np.ndarray:
    """Generate a sine wave tone with fade in/out."""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    tone = amplitude * np.sin(2 * np.pi * frequency * t)

    # Apply fade in/out to prevent clicks
    fade_samples = int(FADE_MS / 1000 * sample_rate)
    fade_in = np.linspace(0, 1, fade_samples)
    fade_out = np.linspace(1, 0, fade_samples)
    tone[:fade_samples] *= fade_in
    tone[-fade_samples:] *= fade_out

    # Convert to 16-bit PCM
    return (tone * 32767).astype(np.int16)


def main():
    output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "markers", "tones")
    os.makedirs(output_dir, exist_ok=True)

    for name, freq in TONES.items():
        tone = generate_tone(freq, DURATION, SAMPLE_RATE, AMPLITUDE)
        filepath = os.path.join(output_dir, f"{name}.wav")
        wavfile.write(filepath, SAMPLE_RATE, tone)
        print(f"Generated {filepath} ({freq}Hz, {DURATION}s, {len(tone)} samples)")


if __name__ == "__main__":
    main()
