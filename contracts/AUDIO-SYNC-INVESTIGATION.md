# Audio Sync Investigation

## Problem Statement

Voice audio playback is consistently ~2 seconds behind demo video during replay.
When listening to sliced audio: ~8 seconds of countdown is heard before players react to match start, but the demo already shows ~2 seconds of gameplay at that point.
The offset is not perfectly consistent across maps/sessions.

---

## The Full Timestamp Chain

Every step from "sound enters microphone" to "audio plays in browser" — and where precision is lost.

```
 QW Server (mvdsv + KTX)                    Discord / Craig
 ========================                    ================
 KTX: StartTimer()                           Bot joins voice channel
   |                                            |
   +-> match_in_progress = 1                    +-> new Date() = recording_start_time
   +-> StartDemoRecord()                        |   (millisecond precision, JS Date)
   |     |                                      |
   |     +-> SV_MVD_SendInitialGamestate()      +-> Opus packets arrive
   |           |                                |   (20ms frames, silence-padded)
   |           +-> time(NULL) = epoch     [A]   |
   |                (SECOND precision)          |
   |                                            |
   +-> countdown (k_count seconds, typ 10)      +-> Audio recording continues...
   |                                            |
   +-> StartMatch()                             |
   |   match_in_progress = 2                    |
   |   match_start_time = g_globalvars.time     |
   |                                            |
   |   ... 20 minutes of gameplay ...           |   ... recording ...
   |                                            |
   +-> Match ends                               |
   |   ktxstats written:                        |
   |     date = QVMstrftime(0)            [B]   |
   |     (SECOND precision, match END)          |
   |     duration = gameplay only               |
   |     (excludes countdown)                   |
   |                                            |
   +-> Demo file saved to server                +-> recording_end_time = new Date()
        uploaded to d.quake.world                    session_metadata.json written
        ktxstats uploaded                            |
             |                                      |
             v                                      v
      QW Hub (Supabase)                     quad Processing Pipeline
      =================                     =======================
      Demo parser reads epoch         [C]   Reads session_metadata.json
      from MVD serverinfo                   Reads recording_start_time
      (priority: epoch > ktxstats           Queries Hub API for matches
       > matchdate print)                        |
      Stores as `timestamp`                      v
      in v1_games table                     Match Pairer
      (SECOND precision)                    =============
             |                              audioStart = (hubTimestamp - recordingStart) / 1000
             |                              audioEnd   = (ktxstatsDate - recordingStart) / 1000
             +----> Hub API query --------> or audioEnd = audioStart + 1210 (default fallback)
                    returns timestamp             |
                    as ISO string                 v
                                            Audio Splitter (ffmpeg)
                                            =======================
                                            ffmpeg -y -ss {audioStart} -to {audioEnd}
                                              -i recording.ogg -c copy
                                              -avoid_negative_ts make_zero output.ogg
                                                  |
                                                  v
                                            Firebase Upload
                                            ===============
                                            Storage: voice-recordings/{team}/{sha256}/{user}.ogg
                                            Firestore: voiceRecordings/{sha256}
                                              recordedAt: hubTimestamp
                                                  |
                                                  v
                                            MatchScheduler Playback
                                            =======================
                                            Hub demo iframe: time 0 = demo start = countdown
                                            postMessage: { key: "current_time", value: 12.34 }
                                            audioTime = demoElapsedTime + manualOffset (+1.0s default)
                                            drift threshold: 300ms
```

**Confirmed by vikpe (QW Hub maintainer):**
> "hub demo parser use epoch in serverinfo if available, else from ktxstats else from matchdate print"
> "all three have second precision"
> "epoch is when the countdown starts"

---

## Key Timestamps at Each Stage

| Stage | Timestamp | Precision | Represents | Source |
|-------|-----------|-----------|------------|--------|
| **[A] MVD epoch** | `time(NULL)` | 1 second | Countdown start | mvdsv `SV_MVD_SendInitialGamestate()` |
| **[B] ktxstats date** | `QVMstrftime(0)` | 1 second | Match END | KTX `json_match_header()` |
| **[C] Hub timestamp** | from epoch | 1 second | Countdown start | Hub demo parser |
| **[D] Recording start** | `new Date()` | 1 millisecond | Session created | quad `RecordingSession` constructor |
| **[E] Craig start** | Craig metadata | ~1 second? | Recording start | Craig bot NTP-synced |

---

## Suspect Analysis

### Suspect 1: QW Server Clock Skew (HIGH — most likely primary cause)

**The theory:** If the QW server's system clock is N seconds ahead of UTC, the epoch will be N seconds ahead of reality. The recording bot's clock (Discord server / Craig NTP) is presumably correct. Result: `audioStart` is calculated N seconds too late, slicing starts N seconds into the countdown instead of at the beginning.

**Evidence:**
- User observes ~8 seconds of countdown audio instead of expected ~10
- This means the slice starts ~2 seconds after countdown actually begins
- A QW server clock that's 2 seconds ahead would produce exactly this
- Different servers have different clock skews, explaining inconsistency across maps

**How to verify:**
- Compare QW server `time(NULL)` with a known-accurate NTP source at the same moment
- Run `date +%s` on the QW server and compare with `date +%s` on the recording machine simultaneously
- Or: record a match where you know the exact countdown start time and compare

### Suspect 2: Second-Precision Rounding (MEDIUM — contributes 0-1s)

**The theory:** `time(NULL)` truncates to whole seconds. If countdown starts at 12:00:00.800, epoch records 12:00:00. This means the hub timestamp is 0.8 seconds early. Combined with the recording start having millisecond precision, you get up to 1 second of random offset per match.

**Evidence:**
- All three Hub timestamp sources have second precision (confirmed by vikpe)
- Recording start has millisecond precision
- This creates an asymmetric precision mismatch
- Could explain the inconsistency between maps (random 0-1s per match)

**Impact:** 0 to 1 second, random direction per match

### Suspect 3: ffmpeg Stream Copy Seek Precision (LOW-MEDIUM)

**The theory:** `ffmpeg -ss {time} -c copy` seeks to the nearest packet boundary. For OGG/Opus with 20ms packets this should be precise, but OGG page boundaries could cause up to ~200ms offset.

**How to verify:**
- Check actual slice start time with `ffprobe` on the output file
- Compare requested vs actual start time

### Suspect 4: MatchScheduler +1.0s Default Offset (KNOWN — already compensates)

The MatchScheduler playback code has a hardcoded `manualOffset = 1.0` that shifts audio 1 second forward. This was added to compensate for "audio element decode latency." If the actual issue is clock skew, this offset partially masks it but doesn't fix it.

**In the code:** `VoiceReplayService.js` line 17:
```javascript
let _manualOffset = 1.0; // default +1s compensates for audio element decode latency
```

### Suspect 5: Craig Bot Timestamp Accuracy (LOW)

Craig is NTP-synced and widely used. Its timestamps should be accurate to <100ms. However, Craig's recording start time format and how quad reads it for non-quad recordings needs verification.

### Suspect 6: Discord Audio Pipeline Latency (VERY LOW)

Discord voice has ~20-50ms latency. Not enough to explain 2 seconds.

### Suspect 7: Demo Player Timeline Start (LOW)

The MatchScheduler code explicitly states: "audio second 0 = demo second 0, no countdown subtraction." The demo player starts from the demo file's beginning, which is countdown start. This alignment is correct by design.

---

## The Math That Matters

The core offset calculation in `quad/src/modules/processing/stages/match-pairer.ts:97`:

```typescript
const audioStart = (matchTs.getTime() - recordingStart.getTime()) / 1000;
```

Where:
- `matchTs` = Hub's `timestamp` = MVD epoch = **countdown start** (second precision)
- `recordingStart` = quad's `recording_start_time` (millisecond precision)

Then in MatchScheduler playback (`VoiceReplayService.js`):
```javascript
audioTime = demoElapsedTime + manualOffset  // manualOffset defaults to +1.0s
```

Where:
- `demoElapsedTime` = seconds since demo start (= seconds since countdown start)
- The sliced audio's time 0 = audioStart position in the recording

**So the total offset between "what you hear" and "what you see" is:**
```
total_error = server_clock_skew + rounding_error + ffmpeg_seek_error - manualOffset(1.0s)
```

If `server_clock_skew = +2s` and `rounding_error = ~0.5s` average:
```
total_error = 2.0 + 0.5 + 0.0 - 1.0 = 1.5s (audio behind video)
```

Close to the observed ~2 second discrepancy.

---

## Testing Framework

### Test 1: Clock Skew Measurement (Critical)

Measure the clock difference between QW server and recording source.

**Method A — Simultaneous epoch comparison:**
1. SSH into QW server, run: `date +%s.%N` (or `date +%s`)
2. Simultaneously on recording machine: `date +%s.%N`
3. Compare. Difference = clock skew.

**Method B — Bot match with known timing:**
1. Start quad recording (captures `recording_start_time`)
2. Start a bot match on a local QW server (where you control the clock)
3. Note the exact time countdown starts (from server console)
4. Process through pipeline
5. Check: does `audioStart` match the actual offset between recording start and countdown?

**Method C — NTP verification on QW servers:**
```bash
# On QW server:
ntpq -p              # Show NTP peers and offset
chronyc tracking     # If using chrony
timedatectl status   # systemd NTP sync status
```

### Test 2: Calibration Recordings (Already Started)

The beep test files (`calibration_dm3_zero.ogg` etc.) with:
- Low beep (440Hz) at 0:00 — slice start (should be countdown start)
- Mid beep (880Hz) at ~10.1s — expected gameplay start
- High beep (1320Hz) at ~20:10 — match end

**Measurement:** Listen for keyboard/mouse noise kicking in relative to the mid beep.
If keyboard starts before the beep: audio slice started too late (clock skew positive).
If keyboard starts after the beep: audio slice started too early (clock skew negative).

### Test 3: Bot Match Pipeline Test

Test the full pipeline without relying on live matches or Hub.

1. **Set up local QW server** with known NTP-synced clock
2. **Start quad recording**
3. **Play bot match** (`/map dm3`, add bots, `ready`)
4. **Download the MVD demo** from the server
5. **Read the epoch** from the demo: `strings demo.mvd | grep epoch`
6. **Compare:** `epoch` vs `recording_start_time` — the difference should match `audioStart`
7. **Process through pipeline** — listen to calibration tones for alignment

**Advantages:**
- Eliminates Hub API as a variable (you have the raw MVD epoch)
- Eliminates NTP uncertainty (same machine or known offset)
- Repeatable any time without scheduling real matches

### Test 4: End-to-End Precision Test

Record a distinctive audio cue at a known demo moment:

1. Start recording, start bot match
2. At a specific game event (e.g., first frag, countdown "fight!" text), make a distinctive sound (clap, whistle)
3. Process through pipeline
4. In MatchScheduler, play the demo — check if the audio cue aligns with the game event
5. Measure the offset precisely using audio editing software (Audacity)

### Test 5: Craig vs Quad Comparison

Record the same match with both Craig and quad simultaneously:

1. Both bots in the same voice channel
2. Play a match
3. Process both recordings through the pipeline
4. Compare: do both produce the same offset? Different offset = recording source issue. Same offset = pipeline/server issue.

### Test 6: Mumble Recording Comparison

Same as Test 5 but with a Mumble recording bot:
- Mumble has lower latency than Discord
- If Mumble recordings show the same offset, the issue is server-side (clock/epoch)
- If Mumble recordings are better aligned, the issue is Discord/Craig-side

---

## Isolation Strategy

To efficiently test in parallel, isolate each component:

| Component | How to Isolate | What it Proves |
|-----------|----------------|----------------|
| **QW server clock** | Compare `time(NULL)` with NTP reference | Clock skew magnitude |
| **Recording timestamp** | Compare quad `new Date()` with NTP | Recording clock accuracy |
| **Hub timestamp** | Download MVD, read epoch, compare with Hub API | Hub parser accuracy |
| **Slice accuracy** | Compare requested vs actual ffmpeg slice times | ffmpeg precision |
| **Playback sync** | Load known-offset audio into MatchScheduler | Browser sync accuracy |

---

## Proposed Fixes (After Root Cause Confirmed)

### Fix A: Server Clock Skew Compensation

If clock skew is confirmed as the primary cause:

1. **Per-server offset calibration**: Measure clock skew for each QW server, store in config
2. **Apply offset at pairing time**: `audioStart = (matchTs - recordingStart) / 1000 - serverClockOffset`
3. **Cons:** Requires measuring each server, skew can drift over time

### Fix B: User-Adjustable Offset (Already Exists)

The MatchScheduler already has a manual offset slider (range -10s to +10s).
This is the quick workaround — users adjust until it sounds right.

### Fix C: Auto-Calibration via Audio Analysis

Detect the countdown beeps or "FIGHT!" sound in the audio to find the exact match start:
1. Scan the first 15 seconds of sliced audio for the characteristic countdown tones
2. Calculate the actual countdown duration from the audio
3. Auto-adjust the offset

### Fix D: Use Match-Start Timestamp Instead of Epoch

Instead of using the Hub timestamp (countdown start), calculate:
`matchGameplayStart = hubTimestamp + countdownDuration`

And align audio to gameplay start instead of countdown start.
The demo player could also seek past countdown automatically.

### Fix E: Embed Timing Markers in the Audio

During recording, inject a sub-audible marker (e.g., 1Hz pulse) at known timestamps.
During playback, detect the marker to auto-align.

---

## File Reference

| File | What It Does (Timing-Related) |
|------|-------------------------------|
| `quad/src/modules/recording/session.ts:46` | `startTime = new Date()` — recording start |
| `quad/src/modules/recording/track.ts:89-100` | Silence prepend for late joiners |
| `quad/src/modules/recording/track.ts:121-137` | Continuous silence padding (20ms timer) |
| `quad/src/modules/recording/silence.ts` | Silent Opus frame (3 bytes, 20ms) |
| `quad/src/modules/processing/stages/hub-client.ts:57-63` | Hub API query with timestamp filter |
| `quad/src/modules/processing/stages/match-pairer.ts:94-97` | **THE critical offset calc** |
| `quad/src/modules/processing/stages/match-pairer.ts:99-122` | Audio end from ktxstats date or default |
| `quad/src/modules/processing/stages/audio-splitter.ts:53-75` | ffmpeg slice command |
| `quad/src/modules/processing/stages/voice-uploader.ts:302-320` | Firestore manifest write |
| `MatchScheduler/public/js/services/VoiceReplayService.js:17` | `manualOffset = 1.0` default |
| `MatchScheduler/public/js/services/VoiceReplayService.js:229-238` | `audioTime = demoElapsed + offset` |
| `MatchScheduler/public/js/services/VoiceReplayService.js:136-198` | Drift detection + audio seek |

## External References

| Source | URL / Location |
|--------|---------------|
| mvdsv epoch code | `github.com/QW-Group/mvdsv/blob/master/src/sv_demo.c#L1307-L1309` |
| KTX countdown + demo start | `github.com/QW-Group/ktx/blob/master/src/match.c` — `StartTimer()` |
| KTX stats JSON date | `github.com/QW-Group/ktx/blob/master/src/stats_json.c` — `json_match_header()` |
| ktxstats example | `https://d.quake.world/{sha256[0:3]}/{sha256}.mvd.ktxstats.json` |
| Hub API | `https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games` |

---

## Session Log

- **2026-02-16**: Initial investigation. Mapped full timestamp chain. Identified server clock skew as primary suspect. Beep calibration test shows ~2s audio-behind-video. vikpe confirmed epoch = countdown start, second precision.
