# Direct Match Event Signaling for Voice Recording Sync

**Proposal for precise audio-to-demo synchronization via mvdsv → bot event packets**

---

## The Problem

Quad records per-speaker Discord voice audio during QW 4on4 sessions. After recording, it auto-pairs with QW Hub matches and slices audio per-map. The goal: embed synced voice comms into demo playback on the Hub.

The current approach compares epoch timestamps from two independent systems:

```
audio_offset = (hub_match_timestamp - recording_start_time)
```

Where `hub_match_timestamp` comes from the QW Hub API (derived from the MVD demo filename, which mvdsv writes at countdown start), and `recording_start_time` is the bot's `Date.now()` when recording began.

**This subtraction is between two different clocks on two different servers.** Even with NTP, we see **0.5–2.7 seconds of drift**. Here's why:

| Error Source | Typical Magnitude |
|---|---|
| NTP sync precision on VPS hosts | 1–50ms (but can spike to 200ms+ under load) |
| Hub pipeline delay (demo → QTV → indexer → Supabase) | Adds no error to the timestamp itself, but the timestamp granularity is limited to what mvdsv writes in the demo filename |
| MVD demo filename timestamp resolution | **1 second** (integer Unix timestamp in filename) |
| ktxstats `date` field resolution | **1 second** (formatted as `YYYY-MM-DD HH:MM:SS +ZZZZ`) |
| NTP step corrections on game servers | Can jump 0.5–2s if ntpd is using `step` instead of `slew` |
| Discord bot startup jitter | `Date.now()` captured after async voice connection setup |

The **1-second floor** from demo filename resolution alone makes sub-second sync impossible. Combined with NTP variance, the 0.5–2.7s we observe is expected. And QuakeWorld is too fast for 2-second audio drift — a rocket travels 1000 units/s, a quad spawn is a 30-second cycle. Every second matters.

---

## The Insight

**We don't need two clocks to agree. We need one clock to see both events.**

If the game server tells the bot directly — "match just started" — then the bot timestamps the arrival on its own clock, the same clock that's tracking audio position. The entire cross-server clock sync problem vanishes.

```
Before: audio_offset = server_clock_A(match_start) - server_clock_B(recording_start)
                       ^^^^^^^^^^^^                   ^^^^^^^^^^^^
                       Two different clocks — guaranteed drift

After:  audio_offset = bot_clock(packet_arrived) - bot_clock(recording_start)
                       ^^^^^^^^^                   ^^^^^^^^^
                       Same clock — drift is zero
```

The only remaining error source is **network latency** — how long it takes the packet to travel from mvdsv to the bot. On EU infrastructure, this is 5–30ms. Even worst-case intercontinental, it's under 200ms. And it's consistent and measurable, unlike clock drift.

---

## Precision Budget

Every system has error. Here's an honest accounting of every source, current vs proposed:

### Current System (epoch comparison)

| Source | Error | Notes |
|---|---|---|
| Demo filename resolution | ±500ms | Integer seconds — up to 999ms truncation |
| NTP sync between servers | ±50–200ms | Typical VPS, can spike higher |
| NTP step corrections | 0–2000ms | Unpredictable, depends on server config |
| ktxstats date resolution | ±500ms | Integer seconds |
| **Total worst case** | **~500ms–2700ms** | **Matches what we observe** |

### Proposed System (direct event packet)

| Source | Error | Notes |
|---|---|---|
| Network one-way latency | 5–30ms | EU datacenter to EU datacenter |
| Network jitter | ±2–5ms | Typical for EU hosting infra |
| Node.js event loop delay | 1–5ms | HTTP request handler scheduling |
| `performance.now()` resolution | <1ms | High-res monotonic clock |
| Opus frame boundary (ffmpeg slice) | ±10ms | OGG packets are 20ms; `-ss` seeks to nearest |
| **Total worst case** | **~20–50ms** | **50–100x improvement** |

The dominant error in the proposed system is the fixed network one-way latency. But unlike clock drift, this is:
1. **Consistent** — same route, same latency, every packet
2. **Measurable** — we can estimate it via RTT/2
3. **Small** — 5–30ms within EU

### Measured EU Datacenter Latency

These are real inter-region RTT measurements (Azure, 2025). QW servers are typically in NL, SE, FI, DE:

| Route | RTT (ms) | One-way estimate (ms) |
|---|---|---|
| NL ↔ Germany | 10–13 | ~5–7 |
| NL ↔ UK | 12 | ~6 |
| NL ↔ Sweden | 36 | ~18 |
| NL ↔ Norway | 23 | ~12 |
| Sweden ↔ Norway | 16–17 | ~8 |
| Germany ↔ Germany | 10–11 | ~5 |

Network jitter on well-provisioned EU datacenter routes: typically **0.5–3ms** standard deviation. Packet loss under **1%**.

### Can we compensate for network latency?

Yes. RTT/2 (Cristian's algorithm, 1989) is the standard approach. A large-scale measurement study (Pathak et al., PAM 2008) found:

- **89% of internet paths** have one-way delay within 10% of RTT/2
- On a 30ms RTT EU route: actual one-way is 12–18ms (±3ms from the 15ms estimate)
- Worst case on asymmetric routes: could be off by ±6ms

For better accuracy, use **minimum RTT sampling**: send 10–50 probe packets, take the minimum RTT/2. The minimum is closest to true propagation delay (no queuing noise). This narrows error to **±1–2ms**.

**But even without RTT compensation, raw arrival time gives us ±30ms precision.** That's already sub-frame for a 20ms Opus audio frame. Good enough.

### Cross-Validation via Multiple Signals

Four events per map, each with a known interval to the next:

```
countdown_start ─── 10.000s (KTX constant) ──── match_start
match_start ──────── 20:00.000 (timelimit) ───── match_end
match_end ─────────── ~6s (intermission) ──────── map_end
```

The bot measures these intervals from its own arrival times and compares against the known durations:

- **Countdown → match start**: Always exactly 10 seconds in KTX (`k_count` default). If the bot measures 10.030s, one packet had ~30ms more network latency than the other. The error bound on either event is ±30ms.
- **Match start → match end**: Duration is the timelimit (20:00). Second consistency check across a longer interval.
- **Match end → map end**: Intermission is a known constant (~6s). Third consistency check.
- **Server epoch comparison**: Each packet also carries the server's own epoch timestamp. If the *server's* timestamps show a clean 10.000s but the bot measures 10.030s, the 30ms is network jitter. If the server's timestamps also show a discrepancy, the server itself was lagging.

**Discrepancy handling:**

| Measured countdown→start | Meaning | Action |
|---|---|---|
| 9.980–10.020s | Normal jitter (±20ms) | Use arrival times as-is. Already within one Opus frame. |
| 10.020–10.100s | Moderate jitter | Both events usable. Average the two anchors for best estimate. |
| 10.100–10.500s | One packet was delayed | Use the more consistent event as primary anchor; derive the other from the known 10s interval. |
| >10.500s or <9.500s | Something broke | Log warning, fall back to Hub API epoch matching for this map. |

**Redundancy**: If match_start is lost entirely, derive it from `countdown_arrival + 10s`. If both are lost, match_end and map_end still give the end boundary. Need to lose ALL packets for ALL events to have zero data — which requires losing 16-24 packets in a row.

---

## What Exists Already (KTX/mvdsv Infrastructure)

This isn't building from scratch. KTX and mvdsv already have most of the pieces:

### Match Lifecycle (KTX `src/match.c`)

KTX tracks match state with clean transitions:

```
Prewar (players readying up)
  → Countdown (match_in_progress = 1, serverinfo = "Countdown")
    → Match Start (match_in_progress = 2, serverinfo = "20 min left")
      → Match End (match_over = 1)
        → Intermission
```

Each transition is a single function call: `StartTimer()`, `StartMatch()`, `EndMatch()`. These are the exact hooks we'd add event sends to.

### UDP Infrastructure (mvdsv)

mvdsv is a UDP engine. The entire QW protocol — player connections, game state, demos — runs over UDP. The relevant existing infrastructure:

- **Master server heartbeats** (`sv_master.c`): mvdsv already sends periodic UDP packets to master servers. Same `sendto()` on the same socket. This is the exact pattern we'd use.
- **Broadcast system** (`sv_broadcast.c`, Oscar Linderholm 2025): Server-to-server OOB messaging, already live. A player types `.qw <message>`, and the server fires a UDP packet to every known QW server using the standard connectionless packet format. Includes rate limiting (10 msgs/IP/60s) and sender validation. This is the **closest existing precedent** for what we're proposing — server sends a UDP event to an external address.
- **Connectionless packet format**: All OOB communication in QW uses `\xff\xff\xff\xff` + command + payload. The `SV_ConnectionlessPacket()` dispatcher in `sv_main.c` already handles ~15 different commands (status, ping, rcon, connect, broadcast, etc.). Adding a new `event` command is one more entry in this dispatch table.
- **QW key/value format**: The broadcast system already uses `\key1\value1\key2\value2` for structured data (e.g., `\hostport\27500\name\ParadokS\message\Hello`). This is the native QW convention for structured payload — no JSON needed.

### HTTP Client (mvdsv `src/central.c`) — Exists But Not Preferred

mvdsv has a built-in HTTP client using libcurl's async multi interface (`sv_web_post`, `sv_web_get`, `sv_web_postfile`). KTX already uses this at match end to upload ktxstats JSON to `stats.quakeworld.nu` via `localcmd("sv_web_postfile ServerApi/UploadGameStats ...")` in `stats.c`. The response handler can even trigger follow-up actions (broadcast messages, demo uploads). So **push from server → external service already works today for match results**.

However, **UDP is preferred for match events** because:

- Single-threaded engine — even async HTTP has TCP connection setup overhead
- UDP is consistent with the engine's architecture (OOB packets, broadcast system, master server heartbeats)
- Fire-and-forget — no connection state to manage
- Match events need low-latency fire-and-forget, not the guaranteed delivery and bidirectional response that HTTP provides
- The HTTP/libcurl infrastructure remains available if a future use case needs it

### What We'd Add (Conceptual)

**slime's proposed design** — per-event cvars, analogous to client-side `f_on_*` aliases:

```c
// New cvars in mvdsv
sv_on_countdown_start "<ip>:<port>"    // e.g. "hub.quakeworld.nu:27999"
sv_on_match_start     "<ip>:<port>"
sv_on_match_end       "<ip>:<port>"
```

The KTX change is minimal — trigger the event sends at existing state transitions:

```c
// In StartTimer() — match.c, countdown begins
SV_EmitMatchEvent("countdown_start", mapname, team1, team2, NULL, 0, 0);

// In StartMatch() — match.c, after match_in_progress = 2
SV_EmitMatchEvent("match_start", mapname, team1, team2, demoname, 0, 0);

// In EndMatch() — match.c, match finished
SV_EmitMatchEvent("match_end", mapname, team1, team2, demoname, score1, score2);

// In intermission end / map change — when next map loads
SV_EmitMatchEvent("map_end", mapname, team1, team2, demoname, score1, score2);
```

And in mvdsv, `SV_EmitMatchEvent()` is a simple function:

```c
void SV_EmitMatchEvent(const char *event, ...) {
    // Format OOB packet: \xff\xff\xff\xff event \type\match_start\map\dm3...
    // Send via NET_SendPacket() to sv_event_address
    // Send again immediately (back-to-back, same server frame)
    // Receiver deduplicates by seq number — second send is pure insurance
}
```

Each event fires **2 UDP packets back-to-back** (same server frame, ~0–1ms apart). They're independent at the network layer — different IP fragments, different kernel buffer positions — so a single dropped packet doesn't affect the other. Same seq number on both — the receiver takes whichever arrives first and ignores the duplicate.

**Estimated delta: ~30–50 lines in mvdsv** (new cvars + `SV_EmitMatchEvent()` using existing `NET_SendPacket()`) **+ ~10–20 lines in KTX** (4 calls at existing state transitions). No new dependencies. No libcurl. No threads.

Server admins enable it with one cvar per event — or a single `sv_event_address` that applies to all events. Either way, one line in the server config.

---

## Architecture

### Why UDP, Not HTTP

mvdsv/KTX is **single-threaded**. Every microsecond spent on network I/O is a microsecond the game loop isn't processing physics, packets, or player input. This rules out TCP/HTTP as the primary protocol:

- **libcurl HTTP POST**: Even with the async multi interface, TCP requires connection setup (SYN/SYN-ACK/ACK = 1.5 RTT), TLS handshake (another 1-2 RTT for HTTPS), and connection state management. `curl_multi_perform()` is non-blocking per call, but the cumulative overhead of maintaining TCP connections on a single-threaded game server is unnecessary complexity.
- **UDP sendto()**: One syscall. Fire and forget. Sub-microsecond. No connection state, no handshake, no blocking. The same mechanism mvdsv already uses for master server heartbeats and the entire QW network protocol.

UDP is the natural fit. QW is built on UDP — the game protocol, the broadcast system, the master server heartbeats. Adding match event notifications as UDP packets is consistent with the engine's architecture.

**Reliability via redundancy, not retransmission**: Instead of TCP's guaranteed delivery, we send multiple packets per event and rely on multiple events per match. Details in the Reliability section below.

### Phase 1: Direct UDP (MVP)

```
┌──────────┐    UDP        ┌──────────────┐
│  mvdsv   │ ────────────→ │   Quad Bot   │
│  (game   │  match_start  │  (Discord    │
│  server) │  match_end    │   recorder)  │
└──────────┘               └──────────────┘
                                  │
                           notes arrival time
                           on its own clock
                                  │
                           slices audio at
                           exact offset
```

Server admins configure event destinations using per-event cvars — the same pattern as client-side `f_on_*` aliases but for the server:

```
sv_on_countdown_start "<ip>:<port>"
sv_on_match_start     "<ip>:<port>"
sv_on_match_end       "<ip>:<port>"
```

When each event fires, KTX sends a small UDP packet to the configured address. Fire and forget.

**Pros**: Zero infrastructure. One KTX patch + one UDP listener on the bot. No libcurl, no threads, no connections.
**Cons**: Game server admins need the bot's IP + port. Only works for direct connections (no NAT traversal).

### UDP Reliability

UDP packets can be lost. At typical EU datacenter packet loss rates (<0.1%), this is rare — but we design for it:

1. **Multiple sends per event**: Each event fires 2 UDP packets back-to-back (same server frame). Cost: negligible (each packet is <1KB, total overhead ~2KB per match event).

2. **Multiple events per match**: 4 lifecycle events (countdown, start, end, map_end) × 2 packets = 8 packets per map. Probability of losing ALL packets for even one event: astronomically low.

3. **Cross-validation and recovery**:
   - Countdown → match start is always 10.0 seconds (KTX `k_count` default). If countdown is received but match_start is lost, derive it: `countdown_arrival + 10s`.
   - Match start → match end duration is known (20:00 timelimit). Second consistency check.
   - If both countdown and match_start arrive, verify: `match_start - countdown ≈ 10.0s`. If not, a packet was delayed — use the other.

4. **Fallback**: If all UDP packets are lost for a match, the existing epoch-based Hub API matching kicks in (0.5–2.7s precision — still usable, just not ideal).

**Expected real-world reliability**: With 2 sends per event, 4 events per map, and <0.1% packet loss: probability of receiving zero events for a map is approximately 0.001^8 ≈ 10^-24. Effectively zero.

### Phase 2: Central Relay (Hub)

The relay is **protocol-first, not Hub-specific** (vikpe). The packet format is a standard any system can consume — the relay is just one consumer that redistributes events. The Hub (`hub.quakeworld.nu`) is the natural host since it already aggregates QW server data, but any service could implement the same UDP listener.

```
┌──────────┐              ┌─────────────────┐              ┌──────────────┐
│  mvdsv   │   UDP OOB    │                 │   WebSocket  │   Quad Bot   │
│  server  │ ───────────→ │  hub.quake      │ ───────────→ │  (central)   │
│  #1      │              │  world.nu       │              └──────────────┘
└──────────┘              │                 │
                          │  - stores events│              ┌──────────────┐
┌──────────┐              │  - forwards to  │   WebSocket  │   Self-hosted│
│  mvdsv   │   UDP OOB    │    subscribers  │ ───────────→ │   Bot #2     │
│  server  │ ───────────→ │  - public API   │              └──────────────┘
│  #2      │              │    for replays  │
└──────────┘              │                 │              ┌──────────────┐
                          │                 │   Webhook    │   Future     │
┌──────────┐              │                 │ ───────────→ │   consumer   │
│  mvdsv   │   UDP OOB    │                 │              │   (stats?)   │
│  server  │ ───────────→ │                 │              └──────────────┘
│  #N      │              └─────────────────┘
└──────────┘
    ▲
    │
  All servers send UDP to the same address
  (sv_event_address "hub.quakeworld.nu:27999")
```

The relay:

- **Receives** UDP OOB packets from any mvdsv server (authenticated via HMAC)
- **Stores** events with timestamps (useful for real-time status, stats, analytics)
- **Forwards** to registered subscribers via WebSocket (persistent, low-latency) or webhook (HTTP POST callback)
- **Deduplicates**: Multiple sends of the same event are collapsed using sequence numbers

**Why WebSocket for relay → bot?** Self-hosted bots (like quad on Xerial's server) are behind NAT without public URLs. A WebSocket lets them connect **outbound** to `wss://hub.quakeworld.nu/events/ws` and receive events pushed to them — the same pattern Discord's own Gateway uses for bots. No ports to open, no public IP needed.

**Added relay latency**: One extra network hop. EU datacenter → EU datacenter adds ~5–15ms. Total latency budget stays well under 50ms.

**Relay storage**: Stateful — events stored for 30 days. This enables reconnect backfill (bot missed events during a brief disconnect), a live match dashboard, and historical analytics. Storage is trivial: ~200 servers × ~10 events/day × 1KB = ~2MB/day.

### Phase 2b: Beyond Voice Sync

Once game servers are pushing events to a central endpoint, this becomes infrastructure for the whole community:

- **Hub integration**: The Hub already does adaptive polling — normal rate during idle, aggressive (1/sec) as a detected match nears its end, so demos/stats appear almost instantly after a game finishes. Push events would complement this: instant match *start* awareness (the one thing polling can't catch quickly) while the Hub's existing aggressive-near-end polling handles post-match data.
- **Match notifications**: Discord alerts when your team's match starts
- **Auto-record triggering**: Bot auto-joins voice when a registered team's match begins — no manual `/record start`
- **Live spectator overlays**: Stream-friendly score tickers, event feeds for shoutcasters
- **Community analytics**: Peak hours, popular maps, active servers — derived from event stream

---

## Event Payload

### Native QW Connectionless Packet Format (Recommended)

Use the standard QW OOB packet format — the same format used by the broadcast system, server status queries, and master server protocol. No new serialization. Every QW developer already knows how to parse this:

```
\xff\xff\xff\xffevent \type\match_start\map\dm3\mode\4on4\tl\20\t1\]sr[\t2\red\p\ParadokS razor zero grisling\p2\ulf bps xantom hangtime\seq\42\h\a3f8b2c1\n
```

- `\xff\xff\xff\xff` — standard QW OOB marker (4 bytes)
- `event` — command name (dispatched by `SV_ConnectionlessPacket()`)
- `\key\value` pairs — native QW info string format, same as the broadcast system uses
- `\h` — truncated HMAC for authentication
- Total size: ~200–350 bytes, well under the 1472-byte MTU-safe UDP payload limit

For `match_end`, add scores and demo SHA256:

```
\xff\xff\xff\xffevent \type\match_end\map\dm3\s1\142\s2\97\demo\a1b2c3d4...\seq\43\h\e5f6a7b8\n
```

This format is parsed by the same `Info_ValueForKey()` / `Cmd_TokenizeString()` functions that already exist in every QW codebase (server, client, master). Zero new parsing code needed on the sender side.

### Alternative: Compact JSON

If richer metadata is needed (nested team/player data, future extensibility), a compact JSON payload also fits in a single UDP datagram:

```json
{"e":"match_start","v":1,"map":"dm3","mode":"4on4","tl":20,"t":["]sr[","red"],"p":["ParadokS","razor","zero","grisling","ulf","bps","xantom","hangtime"],"ts":1739827131,"seq":42,"h":"a3f8b2c1"}
```

~250 bytes. Trade-off: more expressive, but requires a JSON library in the C codebase (or manual formatting with `snprintf`).

### Payload Design Decisions

- **`ts` (timestamp)**: Server's own Unix epoch — useful for diagnostics and logging, but the bot does **NOT** rely on it for sync. The bot uses its own arrival time.
- **`seq` (sequence number)**: Monotonic per server. The relay uses this to deduplicate repeated sends. The bot uses it to detect gaps.
- **`h` (auth hash)**: Truncated HMAC of the payload using the server's key. Prevents spoofing.

Events sent: `countdown_start`, `match_start`, `match_end`, `map_end`. Each sent 2 times back-to-back. With 3–5 maps per session, that's ~24–40 tiny UDP packets over a 2-hour session. **Total bandwidth: ~10–15 KB per session.** Negligible.

---

## Security

### Authentication

Each server gets a shared secret key, configured via a new cvar:

```
sv_event_authkey "server-specific-secret"
```

Every UDP packet includes a truncated HMAC-SHA256 of the payload using this key. The relay (or direct bot) verifies before processing.

This is the same pattern as `sv_www_authkey` (used by the badplace.eu/quakeworld.fi player auth system) — but as a separate cvar since the event system uses UDP, not the existing HTTP infrastructure. No conflict with existing `sv_www_address` configuration.

### Abuse Prevention

| Threat | Mitigation |
|---|---|
| Spoofed events (fake match starts) | HMAC signature in every packet, verified per server key |
| UDP flood on relay | Rate limiting: max 10 events/minute per source IP (legitimate max is ~3/minute during active play) |
| Replay attacks | Monotonic sequence number per server; relay rejects seen sequence numbers |
| Spoofed source IP | HMAC verification makes IP spoofing useless — attacker can't forge the hash without the key |
| Compromised server key | Per-server keys; revoke individual keys without affecting others |

### Privacy

- **Opt-in only**: Servers must explicitly configure `sv_on_*` cvars to send events. Off by default.
- **Player data**: Events contain QW player names (already public via server browser and Hub). No personal data beyond what's already visible to anyone querying the server.
- **Retention**: Events stored for 30 days (enough for pipeline processing + debugging), then purged

---

## Bot-Side Implementation

When the bot receives a match event, it maps it to the audio timeline:

```typescript
// Pseudocode — the core sync logic
import dgram from 'node:dgram';

// Recording start, tracked on bot's own clock
const recordingStartMs = performance.now(); // high-resolution monotonic

// ... recording happens ...

// UDP listener for match events
const eventSocket = dgram.createSocket('udp4');
eventSocket.bind(27999);

eventSocket.on('message', (msg, rinfo) => {
  const arrivalMs = performance.now(); // same clock as recording start

  const event = parseEventPacket(msg);
  if (!verifyHMAC(event, getServerKey(rinfo.address))) return;
  if (isDuplicate(rinfo.address, event.seq)) return; // dedup repeated sends

  // Exact audio offset — same clock, no drift
  const audioOffsetMs = arrivalMs - recordingStartMs;

  // Store for later slicing
  storeMatchEvent({
    event: event.type,
    audioOffsetMs,
    map: event.map,
    players: event.players,
  });
});

// After recording stops, slice audio using stored events
// ffmpeg -i recording.ogg -ss {offsetMs/1000} -t {duration} -c copy map.ogg
```

The key line: `arrivalMs - recordingStartMs`. Both values from `performance.now()` — a monotonic high-resolution clock that doesn't jump with NTP corrections. **This is the line that eliminates the 0.5–2.7s drift.**

### Why `performance.now()`, Not `Date.now()`

| API | Resolution | Monotonic | NTP-proof |
|---|---|---|---|
| `Date.now()` | 1ms | No — jumps on NTP sync | No |
| `performance.now()` | ~0.001ms (microsecond) | Yes | Yes |
| `process.hrtime.bigint()` | ~1ns | Yes | Yes |

The bot currently uses `Date.now()` in its recording module. Switching the elapsed-time path to `performance.now()` eliminates 1ms resolution noise and — crucially — protects against NTP step corrections that can jump the clock mid-recording. `Date.now()` is still used for the initial wall-clock timestamp (for external correlation), but all internal elapsed-time math uses the monotonic clock.

### Audio Slicing Precision

- Discord Opus frames: 20ms each (48kHz, 960 samples/frame)
- The bot's silence padding uses frame counting with wall-clock catch-up (`track.ts:126-137`), self-correcting every 20ms tick — maximum instantaneous drift is bounded at one frame (20ms), average approaches zero
- ffmpeg `-ss` with `-c copy`: seeks to the nearest Opus packet boundary (**20ms granularity**)
- Sub-20ms would require re-encoding — unnecessary since 20ms is well below human audio sync perception (~50ms)

**Note**: ffmpeg `-ss` placed *before* `-i` (input seeking) snaps to the nearest OGG **page** boundary, which can be up to 200ms with our 10-packet page config. Placing `-ss` *after* `-i` gives packet-level precision (20ms). Minor performance cost for large files — worth it.

**Bottom line: the audio pipeline is already capable of ±10ms precision.** The bottleneck was always the cross-server clock comparison, not the audio handling.

---

## Comparison: Existing Gaming Precedents

This isn't a novel pattern. Major competitive games have server → external service event push:

| System | Protocol | Latency | Auth | Events |
|---|---|---|---|---|
| **QW `.qw` broadcast** (2025) | **UDP OOB** | 1–5ms | Master server validation + rate limit | Cross-server chat, `\key\value` payload |
| **QW ktxstats upload** | HTTP POST (libcurl) | 50–200ms | `sv_www_authkey` | Match results JSON at game end → `stats.quakeworld.nu` |
| **Source Engine `logaddress_add`** | **UDP** | 1–5ms | IP whitelist | All server log events streamed to external IP |
| **CS2 Game State Integration** | HTTP POST (localhost) | <1ms | Token in header | Round start/end, kills, bomb, freezetime |
| **FACEIT/ESEA** | Custom protocol | <50ms | API key + TLS | Match lifecycle for anti-cheat + stats |
| **Proposed: QW match events** | **UDP OOB** | **5–30ms** | **HMAC** | **Countdown, match start, match end, map end** |

**The closest precedent is already in mvdsv** — the `.qw` broadcast system (`sv_broadcast.c`, 2025). It uses the exact same infrastructure we'd use: OOB connectionless packets (`\xff\xff\xff\xff`), `\key\value` payload format, UDP fire-and-forget via `NET_SendPacket()`. The broadcast system sends to *every known QW server*; we send to *one configured address*. Simpler.

Source Engine's `logaddress_add` is the closest external precedent — a cvar that takes `<ip>:<port>` and streams all server log events as UDP packets. It powers ESEA, FACEIT, and Leetify. Our `sv_on_match_start` cvars are the same pattern, scoped to 3 match lifecycle events.

The KTX ktxstats pipeline also already pushes match data to an external service — `stats.quakeworld.nu` receives full match stats JSON via HTTP POST at match end. We're extending the concept from "push stats at match end" to "push lightweight events at countdown, start, and end." Same idea, lighter protocol.

---

## Adoption Path

### For Server Admins (Minimal Friction)

Add event destination cvars to the server config:

```
sv_event_address "hub.quakeworld.nu:27999"
sv_event_authkey "their-api-key"
```

Or, if per-event granularity is preferred:

```
sv_on_countdown_start "hub.quakeworld.nu:27999"
sv_on_match_start     "hub.quakeworld.nu:27999"
sv_on_match_end       "hub.quakeworld.nu:27999"
sv_event_authkey      "their-api-key"
```

Same nQuakeSV packaging path. No new binaries beyond the updated KTX/mvdsv. No new dependencies, no ports to open (outbound UDP only — same as master server heartbeats).

### Rollout Phases

1. **Alpha** (1–2 servers): Patch KTX on Xerial's server + one test server. Quad bot receives UDP events directly (Phase 1). Validate precision.
2. **Beta** (5–10 servers): Hub adds a UDP event listener + WebSocket forwarding. Invite friendly server admins. Iterate on payload format.
3. **Release**: Merge KTX changes upstream. Include in next nQuakeSV release. All servers that update get it.

### Backward Compatibility

The existing epoch-based matching remains as fallback. If a server hasn't updated KTX, the bot falls back to Hub API timestamp comparison (current behavior). Both systems coexist — direct events just take priority when available.

---

## What This Unlocks

Beyond fixing the sync problem, a UDP event feed from game servers to a central relay is foundational infrastructure:

| Use Case | Description |
|---|---|
| **Sub-50ms voice sync** | The original goal. Precise audio slicing for demo-synced voice replay. |
| **Real-time Hub updates** | Hub currently polls servers. Push events complement this with instant match *start* awareness. |
| **Match start notifications** | Discord alerts: "Your team just started on dm3 vs ]sr[!" |
| **Auto-record triggering** | Bot could auto-join voice when a registered team's match begins (no manual `/record start`). |
| **Live spectator overlays** | Stream-friendly score tickers, event feeds for shoutcasters. |
| **Community analytics** | Peak hours, popular maps, active servers — derived from event stream. |

---

## Summary

| Aspect | Current | Proposed |
|---|---|---|
| **Precision** | 500–2700ms | 20–50ms |
| **Clock dependency** | Two servers must agree | Single clock (bot's own) |
| **Protocol** | N/A (pull-based) | UDP (fire-and-forget, like QW itself) |
| **KTX code change** | None | ~10–20 lines (4 event calls at existing hooks) |
| **mvdsv code change** | None | ~30–50 lines (new cvars + `SV_EmitMatchEvent()`) |
| **Server admin config** | None | 1–3 cvars (`sv_on_match_start`, etc.) |
| **Bot code change** | None (fallback preserved) | One UDP listener |
| **New dependencies** | N/A | None — uses existing UDP socket |
| **Threading impact** | N/A | Zero — `sendto()` is non-blocking |
| **Fallback** | N/A | Existing epoch matching still works |
| **Match pairing** | Queries Hub API post-hoc | Event payload IS the pairing (map, players, teams, demo) |
| **Hub dependency** | Required for match detection | Optional (fallback only) |
| **Beyond voice sync** | Nothing | Foundation for real-time QW event infrastructure |

The core idea is simple: **don't synchronize two clocks — eliminate the need for two clocks.** Let the game server tell the bot directly, and let the bot timestamp the arrival on its own clock. The same clock it uses for audio. Same clock = zero drift.

The protocol choice is equally simple: **UDP, like everything else in QW.** Fire a packet, move on. No connections, no threads, no blocking. The same `sendto()` call mvdsv uses for master server heartbeats, reused for match events. slime's "udphook" concept — `sv_on_match_start <ip>:<port>` — mirrors the client-side `f_on_*` alias convention, keeping it native to QW's design philosophy.

A secondary win: the event payload contains everything needed for match pairing — map, players, teams, demo filename. The bot no longer needs to query the Hub API to figure out *which* match belongs to *which* recording. The game server tells it directly, in real time, with all the metadata. The existing Hub query becomes a fallback for servers that haven't updated, not the primary mechanism.

Everything else — the relay, the authentication, the forwarding — is logistics. Important logistics, but logistics that build on infrastructure KTX and mvdsv already have.

---

*ParadokS (]sr[) — February 2026*
*Built on research from the quad voice recording project: github.com/...*
