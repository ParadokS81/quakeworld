# QW Voice Analysis - Claude Code Context

## Project Purpose
AI-powered analysis of team voice communications from QuakeWorld 4on4 matches. Processes Discord voice recordings (via Craig bot) to provide insights on communication patterns, callout effectiveness, and team coordination.

## Architecture Overview

### Pipeline Flow (timestamp-based)
```
Craig zip -> Parse Craig metadata (startTime, tracks)
          -> Query QW Hub API (match timestamps, maps, players, scores)
          -> Pair matches to recording (timestamp alignment)
          -> Fetch ktxstats (duration, weapon stats, item control)
          -> Split audio using calculated offsets
          -> Whisper transcribe per-player tracks
          -> Merge into unified timeline
          -> Claude analysis enriched with match data
          -> Markdown report per map
```

### Key Design Decisions
- **Craig bot** records each Discord speaker as a separate FLAC track (speaker diarization solved)
- **QW Hub API** provides match timestamps and ktxstats for timestamp-based audio splitting
- **Offset calculation**: `match_offset = match_timestamp - craig_startTime`
- **faster-whisper** (CTranslate2) for CPU-optimized transcription on AMD Ryzen 3900X
- **No GPU required** - entire pipeline runs on CPU
- Processing is batch/offline, not realtime
- Legacy marker-tone pipeline preserved via `--legacy` flag

### Data Flow
```
recordings/raw/                                    -> Craig zip exports dropped here
processed/2026-02-01_]sr[_vs_red_dm4_01/           -> Split audio, transcripts, analysis per match
```

## Tech Stack
- **Python 3.11+** - Core pipeline
- **faster-whisper** - Speech-to-text (CTranslate2 backend, CPU)
- **httpx** - HTTP client for QW Hub API
- **scipy** - FFT-based tone detection (legacy)
- **pydub/ffmpeg** - Audio manipulation
- **anthropic** - Claude API for analysis
- **PyYAML** - Configuration

## Project Structure
```
voice-analysis/
├── CLAUDE.md              # This file - project context for Claude Code
├── PLAN.md                # Implementation plan (timestamp-based pipeline)
├── config/
│   └── settings.yaml      # Pipeline configuration (API, pairing, team, whisper)
├── src/
│   ├── api/               # QW Hub API client
│   │   └── qwhub_client.py
│   ├── capture/           # LEGACY: Marker tone generation
│   │   └── generate_tones.py
│   ├── processing/        # Audio processing modules
│   │   ├── craig_parser.py       # Parse Craig zip/dir, extract startTime & tracks
│   │   ├── match_pairer.py       # Pair QW Hub matches to Craig recording window
│   │   ├── timestamp_splitter.py # Split audio using calculated offsets
│   │   ├── transcriber.py        # faster-whisper transcription
│   │   ├── timeline_merger.py    # Merge transcripts into unified timeline
│   │   ├── tone_detector.py      # LEGACY: FFT marker detection
│   │   └── audio_splitter.py     # LEGACY: Tone-based splitting
│   ├── analysis/          # Claude-powered analysis
│   │   └── analyzer.py    # Enriched with match data + ktxstats
│   ├── utils/             # Shared utilities
│   │   └── audio_utils.py
│   └── pipeline.py        # Main orchestrator (6-step + legacy fallback)
├── knowledge/             # QW domain knowledge for analysis
│   ├── maps/              # Map callouts and layouts
│   ├── terminology/       # QW glossary
│   │   └── qw_glossary.yaml
│   └── team/              # Team-specific conventions
│       └── player_mappings.yaml
├── markers/               # LEGACY: Distribution package for marker tones
│   ├── tones/             # Generated WAV marker files
│   ├── ahk/               # AutoHotkey scripts
│   └── ezquake/           # ezQuake config snippets
├── recordings/raw/        # Craig exports (gitignored)
├── processed/             # Pipeline output (gitignored)
└── requirements.txt
```

## QuakeWorld Context

### Game Mode
- 4on4 team deathmatch (4 players per team)
- Maps: dm3, dm2, e1m2, schloss, phantombase (in order of popularity)
- Standard timelimit: 20 minutes per map
- Multiple maps per session

### Team
- **ParadokS** (team leader), Razor, zero, grisling
- Team tag: `]sr[`
- Roster may include standins - Craig records actual Discord usernames
- Craig exports contain speaker names from Discord
- Player mappings: `knowledge/team/player_mappings.yaml`

### Communication Patterns to Analyze
- Callout timing and accuracy
- Communication balance (who talks too much/little)
- Silence during chaotic moments
- Overlapping speech / talking over each other
- Consistency of callout terminology
- Comms-performance correlation (via ktxstats)

### QW Hub API
- Match data: hub.quakeworld.nu
- Supabase REST API for match history, stats, demos
- ktxstats: per-player weapon stats, item control, damage
- API client: `src/api/qwhub_client.py`

## Infrastructure

### Development
- WSL Ubuntu on Windows
- Python virtual environment in project root

### Production (Future)
- Unraid server at 100.114.81.91 (Tailscale)
- Docker container deployment
- SSH: `ssh -i ~/.ssh/id_rsa root@100.114.81.91`

## Common Operations

### Process a recording (new pipeline)
```bash
python src/pipeline.py recordings/raw/craig_export.zip
```

### Process with options
```bash
python src/pipeline.py recordings/raw/session/ --skip-analysis --player-query paradok
python src/pipeline.py recordings/raw/session/ --skip-api --maps dm3,dm2
python src/pipeline.py recordings/raw/session/ --legacy --maps dm4
```

### Test API client
```bash
python src/api/qwhub_client.py 2026-01-29T21:00:00+00:00 2026-01-29T23:00:00+00:00 paradok
```

### Test Craig parser
```bash
python src/processing/craig_parser.py recordings/raw/test-session/
```

### Run transcription only
```bash
python src/processing/transcriber.py processed/2026-02-01/dm3_001/audio/
```

## Pipeline Fallback Chain
1. QW Hub API (primary) -> timestamp splitting
2. `--skip-api` with `--maps` -> entire recording per map
3. `--legacy` -> old tone-detection pipeline
4. No matches found -> entire recording as single segment

## Non-Negotiable Rules
1. FLAC is the source format - never discard raw audio
2. All timestamps in the pipeline are relative to recording start (seconds as float)
3. Timeline JSON is the central data format - everything feeds into or reads from it
4. Player names come from Craig metadata, not hardcoded
5. Processing must be idempotent - re-running produces identical output
6. Raw recordings are gitignored - never commit audio files
