"""Benchmark faster-whisper on GPU. Tests sequential vs batched inference.

Usage:
    python benchmark_gpu.py [model] [input_dir] [output_dir] [--batch N]

Examples:
    python benchmark_gpu.py large-v3 /data/input/audio /data/output
    python benchmark_gpu.py turbo /data/input/audio /data/output --batch 16
    python benchmark_gpu.py large-v3 /data/input/audio /data/output --batch 8
"""
import time
import json
import os
import glob
import sys
from pathlib import Path
from faster_whisper import WhisperModel, BatchedInferencePipeline

# Parse args
model_size = "large-v3"
input_dir = "/data/input/audio"
output_dir = "/data/output"
batch_size = 0  # 0 = sequential (no batching)

i = 1
while i < len(sys.argv):
    if sys.argv[i] == "--batch" and i + 1 < len(sys.argv):
        batch_size = int(sys.argv[i + 1])
        i += 2
    elif not sys.argv[i].startswith("--"):
        # Positional args: model, input_dir, output_dir
        positional = [a for a in sys.argv[1:] if not a.startswith("--")]
        pos_idx = positional.index(sys.argv[i])
        if pos_idx == 0:
            model_size = sys.argv[i]
        elif pos_idx == 1:
            input_dir = sys.argv[i]
        elif pos_idx == 2:
            output_dir = sys.argv[i]
        i += 1
    else:
        i += 1

os.makedirs(output_dir, exist_ok=True)

files = sorted(glob.glob(os.path.join(input_dir, "*.ogg")))
if not files:
    files = sorted(glob.glob(os.path.join(input_dir, "*.flac")))

print(f"Found {len(files)} audio files")
for f in files:
    size_mb = os.path.getsize(f) / 1024 / 1024
    print(f"  {os.path.basename(f)}: {size_mb:.1f} MB")

mode = f"batched (batch_size={batch_size})" if batch_size > 0 else "sequential"
print(f"\n=== Loading model: {model_size} | Mode: {mode} ===")
t0 = time.time()
model = WhisperModel(model_size, device="cuda", compute_type="float16", download_root="/models")

pipeline = None
if batch_size > 0:
    pipeline = BatchedInferencePipeline(model=model)

model_load_time = time.time() - t0
print(f"Model loaded in {model_load_time:.1f}s\n")

print(f"=== Transcribing {len(files)} files ===\n")

total_start = time.time()
total_audio_duration = 0.0

for f in files:
    name = os.path.basename(f)
    stem = Path(f).stem
    print(f"Transcribing {name}...", flush=True)

    t0 = time.time()

    if pipeline and batch_size > 0:
        # Batched inference
        segments, info = pipeline.transcribe(
            f,
            batch_size=batch_size,
            language="en",
            vad_parameters=dict(min_silence_duration_ms=300, speech_pad_ms=200),
            word_timestamps=True,
        )
    else:
        # Sequential inference
        segments, info = model.transcribe(
            f,
            beam_size=5,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300, speech_pad_ms=200),
            word_timestamps=True,
        )

    results = {"language": info.language, "duration": info.duration, "segments": []}
    for seg in segments:
        results["segments"].append({
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
        })

    elapsed = time.time() - t0
    audio_dur = info.duration
    total_audio_duration += audio_dur
    n_segs = len(results["segments"])
    n_words = sum(len(s["text"].split()) for s in results["segments"])
    ratio = audio_dur / elapsed if elapsed > 0 else 0

    print(f"  {elapsed:.1f}s ({audio_dur:.0f}s audio, {ratio:.1f}x realtime)")
    print(f"  {n_segs} segments, {n_words} words")

    out_json = os.path.join(output_dir, f"{stem}.json")
    with open(out_json, "w") as fh:
        json.dump(results, fh, indent=2)

    out_txt = os.path.join(output_dir, f"{stem}.txt")
    with open(out_txt, "w") as fh:
        for s in results["segments"]:
            fh.write(s["text"] + "\n")

total_transcribe = time.time() - total_start
overall_ratio = total_audio_duration / total_transcribe if total_transcribe > 0 else 0

print(f"\n{'='*60}")
print(f"Model: {model_size}")
print(f"Mode: {mode}")
print(f"Model load: {model_load_time:.1f}s")
print(f"Transcription: {total_transcribe:.1f}s for {total_audio_duration:.0f}s of audio")
print(f"Speed: {overall_ratio:.1f}x realtime")
print(f"{'='*60}\n")

for f in sorted(glob.glob(os.path.join(output_dir, "*"))):
    size = os.path.getsize(f)
    print(f"  {os.path.basename(f)} ({size:,} bytes)")
