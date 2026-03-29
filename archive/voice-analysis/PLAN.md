# QW Voice Analysis - Implementation Plan

> This plan replaces the marker-tone-based pipeline with a timestamp-based approach
> using the QW Hub API. A fresh Claude Code session should read this file alongside
> CLAUDE.md and implement each section in order.

## Architecture Change Summary

### Old Pipeline (marker tones)
```
Craig FLAC export -> Tone detection (FFT) -> Split by map -> Whisper transcribe -> Merge timeline -> Claude analysis -> Report
```

### New Pipeline (timestamp-based)
```
Craig zip -> Parse Craig metadata (startTime, tracks)
                |
                v
          Query QW Hub API (match timestamps, maps, players, scores)
                |
                v
          Pair matches to Craig window (timestamp alignment)
                |
                v
          Fetch ktxstats per match (duration, weapon stats, item control)
                |
                v
          Split audio using calculated offsets (no tones needed)
                |
                v
          Transcribe per-player tracks (faster-whisper, unchanged)
                |
                v
          Merge into unified timeline (unchanged)
                |
                v
          Claude analysis enriched with match data (scores, stats, map)
                |
                v
          Markdown report per map
```

### Why This Works
- Craig recordings have `startTime` in ISO 8601 with millisecond precision
- QW Hub API returns match `timestamp` with second precision
- Both use NTP-synced clocks (Discord cloud + QW game servers)
- ktxstats provides exact `duration` in seconds
- Offset calculation: `match_offset = match_timestamp - craig_startTime`
- Audio slice: `[match_offset, match_offset + duration]`

### Validated With Real Data
```
Craig start:  15:54:44.674 UTC  (from raw.dat)
MVD epoch:    15:55:26 UTC      (from serverinfo - includes 10s countdown)
Match log:    15:55:36 UTC      (matchdate - actual gameplay start)
Offset:       51.326 seconds into recording
```
The 10s difference between MVD epoch and matchdate is the countdown timer, not clock drift.

---

## New Module: src/api/qwhub_client.py

### Purpose
HTTP client for the QW Hub Supabase REST API. Queries match history and fetches ktxstats.

### Constants
```python
SUPABASE_URL = "https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3Boa2pmb21pbmlteHp0amlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY5Mzg1NjMsImV4cCI6MjAxMjUxNDU2M30.NN6hjlEW-qB4Og9hWAVlgvUdwrbBO13s8OkAJuBGVbo"
KTXSTATS_BASE_URL = "https://d.quake.world"
```

### Class: QWHubClient
```python
class QWHubClient:
    def __init__(self, config: dict | None = None)
    def find_matches(self, start_time: str, end_time: str, player_query: str | None = None, mode: str = "4on4") -> list[dict]
    def fetch_ktxstats(self, demo_sha256: str) -> dict | None
    def find_matches_for_session(self, craig_start: str, craig_duration_seconds: float, player_query: str | None = None) -> list[dict]
    def close(self)
```

### API Query Format
```
GET /v1_games?mode=eq.4on4&timestamp=gte.{start}&timestamp=lt.{end}&order=timestamp.asc&players_fts=fts.{player}
Headers: apikey: {SUPABASE_ANON_KEY}
```

### ktxstats URL Format
```
https://d.quake.world/{sha256[0:3]}/{sha256}.mvd.ktxstats.json
```

### Match Response Shape
```json
{
  "id": 194345,
  "timestamp": "2026-01-29T22:51:34+00:00",
  "mode": "4on4",
  "map": "dm2",
  "demo_sha256": "211b41fd...",
  "teams": [{"name": "]sr[", "frags": 270}, {"name": "pol", "frags": 161}],
  "players": [{"name": "ParadokS", "team": "]sr[", "frags": 46, "ping": 25}, ...]
}
```

### ktxstats Response Shape
```json
{
  "date": "2026-01-29 23:11:44 +0000",
  "map": "dm2",
  "duration": 1200,
  "hostname": "Berlin KTX Server antilag #2",
  "players": [{"name": "ParadokS", "stats": {...}, "weapons": {...}, "items": {...}}]
}
```

### Dependencies
- `httpx>=0.27.0` (add to requirements.txt)

---

## New Module: src/processing/craig_parser.py

### Purpose
Parse Craig bot zip exports. Extract startTime, track metadata, FLAC paths.

### Dataclasses
```python
@dataclass
class CraigTrack:
    track_number: int
    discord_username: str        # "paradoks"
    discord_display_name: str    # "ParadokS"
    audio_path: Path
    duration_seconds: float | None = None

@dataclass
class CraigSession:
    start_time: datetime         # UTC, ms precision from raw.dat
    tracks: list[CraigTrack]
    recording_id: str = ""
    guild_name: str = ""
    channel_name: str = ""
    source_path: Path = None
    extracted_dir: Path = None
```

### Functions
```python
def parse_craig_export(source: str | Path) -> CraigSession
def _parse_raw_dat(raw_dat_path: Path) -> tuple[datetime, list[dict]]
def _parse_info_txt(info_path: Path) -> dict
def _match_tracks_to_files(tracks: list[dict], extracted_dir: Path) -> list[CraigTrack]
def _extract_zip(zip_path: Path) -> Path
```

### raw.dat Format
First bytes are JSON header, rest is binary Opus audio:
```json
{"format":1,"startTime":"2026-02-01T15:54:44.674Z","tracks":{"1":{"username":"paradoks","globalName":"ParadokS"}}}
```
Parse by finding the closing `}` of the first JSON object (brace counting).

---

## New Module: src/processing/match_pairer.py

### Purpose
Pair QW Hub matches to Craig recording window. Calculate audio offsets and confidence.

### Dataclass
```python
@dataclass
class MatchPairing:
    match_id: int
    map_name: str
    timestamp: datetime
    server_hostname: str
    teams: list[dict]
    players: list[dict]
    ktxstats: dict | None = None
    duration_seconds: float = 1200.0
    audio_offset_seconds: float = 0.0
    audio_end_seconds: float = 0.0
    confidence: float = 0.0
    confidence_reasons: list[str] = field(default_factory=list)
    demo_sha256: str = ""
```

### Functions
```python
def pair_matches(craig_session, hub_matches, ktxstats_map=None, clock_tolerance_seconds=5.0, padding_seconds=10.0) -> list[MatchPairing]
def _score_confidence(match, craig_session, audio_offset, has_ktxstats) -> tuple[float, list[str]]
def _validate_no_overlap(pairings) -> list[MatchPairing]
def format_pairing_summary(pairings) -> str
```

### Confidence Scoring
| Factor | Weight | High (1.0) | Low (0.0) |
|--------|--------|------------|-----------|
| Offset positive | 0.3 | offset > 60s | offset < 0 |
| ktxstats available | 0.2 | yes | no |
| Player name overlap | 0.3 | 3+ Craig users match QW players | 0 |
| Reasonable offset | 0.2 | offset < recording duration | offset > duration |

---

## New Module: src/processing/timestamp_splitter.py

### Purpose
Split Craig audio using calculated timestamp offsets. Replaces tone-based splitting.

### Functions
```python
def split_by_timestamps(craig_session, pairings, output_dir, player_name_map=None) -> list[dict]
def _resolve_player_name(discord_username, discord_display_name, player_name_map) -> str
def _clamp_offsets(start, end, track_duration) -> tuple[float, float]
```

### Output Format (compatible with existing audio_splitter)
```python
[{
    "index": 0,
    "map": "dm2",
    "start_time": 1279.5,
    "end_time": 2479.5,
    "players": [{"name": "ParadokS", "audio_file": "...", "duration": 1200.0}],
    "audio_dir": "processed/.../dm2_001/audio",
    "match_id": 194345,
    "match_data": {...},
    "ktxstats": {...}
}]
```

### Output Directory Structure
```
processed/2026-01-29/
├── dm2_001/
│   ├── audio/           # Split player FLACs
│   ├── transcripts/     # Created by transcription step
│   ├── analysis/        # Created by analysis step
│   └── metadata.json    # Segment + match data + ktxstats
├── dm3_002/
└── session_metadata.json
```

---

## Updated Module: src/pipeline.py

### New Steps
```
[1/6] Parse Craig export
[2/6] Query QW Hub API for matches
[3/6] Pair matches to recording & fetch ktxstats
[4/6] Split audio by match timestamps
[5/6] Transcribe each player track
[6/6] Run Claude analysis (enriched with match data)
```

### Updated CLI
```
python src/pipeline.py <craig_zip_or_dir> [options]

    --maps dm3,e1m2          Override map names
    --manual splits.json     Manual split timestamps (legacy)
    --skip-analysis          Skip Claude analysis
    --skip-api               Skip QW Hub API query
    --player-query NAME      Override player search term (default from config)
    --output-dir DIR         Override output directory
    --legacy                 Use old tone-detection pipeline
```

### Fallback Chain
1. QW Hub API (primary) -> timestamp splitting
2. --skip-api with --maps -> single-segment per map
3. --legacy -> old tone-detection pipeline
4. No matches found -> entire recording as single segment

---

## Updated Module: src/analysis/analyzer.py

### Changes
Enrich Claude prompt with ktxstats data. New prompt sections:
- Match result (team scores, server)
- Player performance (frags, deaths, weapon accuracy, damage)
- Item control (Quad/Pent/armor pickups)
- New analysis section: "Comms-Performance Correlation"

### New Functions
```python
def format_match_result(match_data: dict | None) -> str
def format_player_performance(ktxstats: dict | None, team_tag: str) -> str
def format_item_control(ktxstats: dict | None, team_tag: str) -> str
```

### Updated analyze_map
Reads metadata.json for match_data and ktxstats, passes enriched prompt to Claude.

---

## Config Changes: config/settings.yaml

Add these sections:
```yaml
api:
  supabase_url: "https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games"
  supabase_anon_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ktxstats_base_url: "https://d.quake.world"
  timeout_seconds: 30
  session_buffer_minutes: 15

pairing:
  clock_tolerance_seconds: 5.0
  padding_seconds: 10.0
  default_duration_seconds: 1200
  min_confidence: 0.3

team:
  tag: "]sr["
  player_query: "paradok"
  player_name_map:
    paradoks: "ParadokS"
```

---

## Knowledge Files to Create

### knowledge/team/player_mappings.yaml
Discord username -> QW name mappings, team tag.

### knowledge/terminology/qw_glossary.yaml
QW terms for Whisper initial_prompt and Claude context:
- Items: quad, pent, ring, ra, ya, ga, mega, rl, lg, gl, sng, sg, ssg
- Actions: get quad, quad soon, quad up, pack, tp, spawn, stack, low, one shot, out, coming, holding, push
- Map callouts for dm3, dm2, e1m2 (locations like big room, rl room, tele, water, bridge, etc.)

---

## Requirements Update
Add: `httpx>=0.27.0`

---

## Deprecated Modules (keep for --legacy)
- `src/processing/tone_detector.py` - Add legacy comment
- `src/processing/audio_splitter.py` - Still fallback, pair_markers legacy only
- `src/capture/generate_tones.py` - Legacy
- `markers/` directory - Legacy (AHK, Soundpad, ezQuake config)

---

## Implementation Order

1. Config + knowledge files
2. QW Hub API client - test standalone against real API
3. Craig parser - test with real zip in recordings/raw/test-session/
4. Match pairer - test offset calculations
5. Timestamp splitter - test audio splitting
6. Update audio_utils.py (get_audio_duration, resolve_player_name)
7. Update pipeline.py - new flow with fallbacks
8. Update analyzer.py - ktxstats enrichment
9. Update CLAUDE.md
10. Mark legacy modules

---

## Testing Checklist

1. API client: `python -c "from src.api.qwhub_client import QWHubClient; ..."`
   - Query 2026-01-29 21:00-23:00 for paradok, expect 5 matches
2. Craig parser: parse recordings/raw/test-session/ zip
   - Verify startTime = 2026-02-01T15:54:44.674Z, 1 track (paradoks)
3. Match pairer: Craig start 15:54:44.674 + match 15:55:36 = 51.326s offset
4. Full pipeline: `python src/pipeline.py recordings/raw/test-session/ --skip-analysis`
5. Legacy mode: `python src/pipeline.py recordings/raw/test-session/ --legacy --maps dm4`

### Test Data Available
- `recordings/raw/test-session/` - Craig zip from bot match (1 track, 121s)
- `recordings/raw/test-session/4on4_]sr[_vs_red[dm4]20260201-1555.mvd` - MVD demo
- QW Hub API has real ]sr[ matches from 2026-01-29

---

## Future (document only)
- Web dashboard for session review with audio playback
- Auto-ingest via Craig Discord webhook
- Docker deployment with GPU (friend's Ubuntu server with 4090)
- QW Hub demo viewer integration (sync voice with match replay)
- Whisper vocabulary feedback loop (flag uncertain words, user corrects)
- Custom Craig-like Discord bot for full control
