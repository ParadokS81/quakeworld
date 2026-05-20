# quad Mumble audio receiver -- silent recording investigation handoff

**Captured:** 2026-05-20 mid-flow (continuing parent session at ~500k context).
**Status:** RESOLVED 2026-05-20. Acceptance test passed: max_volume -1.0 dB,
mean_volume -25.0 dB on a fresh /record start -> speak -> /record stop
session (parking required > -40 dB). See "Resolution" section at the bottom.
**Goal (when captured):** root-cause why every Mumble auto-record session
writes pure-silence OGG files despite the bot's control-channel state
appearing healthy.

---

## The bug in one paragraph

quad's Mumble auto-record creates valid OGG/Opus per-speaker track files,
correctly maps Mumble session IDs to usernames (recent sessions at least),
finalizes session_metadata.json, and triggers the post-processing pipeline.
The pipeline queries QWHub for matches, pairs them by UTC timestamp, slices
audio at hub-derived match boundaries -- and then the slicer refuses to
write empty .ogg files because **every track measures `max_volume: -91.0 dB,
mean_volume: -91.0 dB`** -- pure digital silence. No upload fires, no
Firestore entry, recording is invisible in the Recordings tab UI.

This has been the case since at least Feb 28 2026; every single Mumble
recording in the archive is silent.

## Hard-verified evidence (do NOT re-derive)

Three Mumble sessions exist in `/mnt/user/appdata/quad/recordings/` on
Unraid. Probed 2026-05-20 via `ffmpeg -t 120 -i <track> -af volumedetect`
inside the quad container:

| Date       | Session ID prefix | Team   | Tracks | max_volume  | mean_volume |
|------------|-------------------|--------|--------|-------------|-------------|
| 2026-02-28 | `b29adc14`        | ]SR[   | 2      | -91.0 dB    | -91.0 dB    |
| 2026-03-20 | `b458289c`        | ToT    | 3      | -91.0 dB    | -91.0 dB    |
| 2026-05-19 | `ffc9e412`        | ]SR[   | 4      | -91.0 dB    | -91.0 dB    |

All three: valid OGG containers, correct n_samples (5,760,000 = 48kHz x 120s),
~2.6 kbit/s data rate (= silence-padded Opus baseline). Same fingerprint
regardless of recording date, team, or duration.

Discord recordings (71 sessions, source=`quad` or `craig` in
session_metadata.json) are unaffected: varied byte sizes per track, normal
playable audio, post-processing pipeline produces map-segments and uploads
to Firebase Storage + Firestore. The Discord receiver works; only Mumble
is broken.

## Ruled out (do NOT investigate these again)

1. **Cert-restart fragility (2026-05-19) as root cause of silence.** The
   Feb 28 and Mar 20 sessions predate any cert work and are equally silent.
   The cert restart MAY still be why the 2026-05-19 session got stuck for
   ~14h without finalizing (the bot's Mumble control socket didn't recover
   cleanly from two rapid mumble-server restarts), but that is a separate
   symptom -- audio loss is not caused by it.
2. **"Equal byte sizes across tracks" as bug signature.** That was an
   earlier (wrong) reading. Equal sizes are the natural result of Mumble
   multichannel recording (continuous silence-padded per-speaker tracks);
   when the audio underneath is silent everywhere, all tracks converge to
   the same byte count at the silence-Opus rate. Real fingerprint is the
   `-91 dB volumedetect` reading, not byte-equality.
3. **Pipeline / slicer bug.** Pipeline behavior is correct: it finds
   matches via Hub, slices at hub timestamps, refuses to emit empty audio
   files when underlying tracks are silent. Re-running `runFullPipeline`
   does not help -- it does its job; the data isn't there.
4. **Mumble session ID -> username mapping.** Recent sessions (May 19)
   correctly identify 4 distinct users (ParadokS / razor / grisling /
   zero). Older sessions (Feb 28 / Mar 20) had multiple tracks all named
   after a single user, which suggests the user-mapping had a separate
   bug that got fixed at some point. That mapping bug is irrelevant to
   the silence -- May 19 has correct mapping AND silent audio.

## Investigation scope (THIS terminal)

Investigation only. **Do not propose fixes until root cause is verified.**
Per CLAUDE.md planning-first: read code, present findings, ask before
touching anything. Per superpowers:systematic-debugging Phase 1: gather
evidence at every component boundary before forming hypotheses.

Where to start:

1. `apps/quad/src/modules/mumble/` -- the Mumble integration module
   directory. Specifically look for:
   - The Mumble client library import (which npm package? `mumble`,
     `mumble-client`, `@cinderella/mumble-streamer`, or a custom impl?)
   - The audio receiver wiring -- where does the bot subscribe to UDP
     voice frames, and where do those frames flow into the per-speaker
     OGG writer?
   - Any `selfDeaf` / `deafen` / `subscribeVoice` / `audioReceive`
     configuration at bot connect time. The Discord-side bot is
     intentionally `selfDeaf: false, selfMute: true` (per `apps/quad/
     CLAUDE.md` non-negotiable rule #4) -- check whether the Mumble-side
     equivalent is set the same way.
2. Compare to `apps/quad/src/modules/recording/` (the Discord recorder
   that works). Find the audio-receive shape there and check whether the
   Mumble equivalent has the same wiring.
3. The Mumble protocol uses **OCB-AES-128 encryption on the UDP voice
   channel**. The control TCP channel (where session IDs come from) is
   TLS. If the bot's UDP crypto state isn't established correctly, all
   received voice packets decrypt to garbage which feeds the Opus decoder
   which produces silence frames. Worth checking whether the client lib
   handles the CryptSetup exchange and whether quad invokes it.
4. Read `/data/mumble_server_config.ini` on the live server (via
   `docker exec mumble-server cat /data/mumble_server_config.ini`) to
   see if there's a server-side setting that affects bot voice
   subscription -- e.g., `allowping`, `obfuscate`, channel ACLs.

## Tools + access

- SSH to Unraid as root via `~/.ssh/id_rsa`: `root@100.114.81.91`
  (Tailscale; alias `unraid`).
- Repo path on host: `/mnt/user/appdata/quad/` (compose stack lives here).
- Recordings: `/mnt/user/appdata/quad/recordings/<session_id>/`.
- python3 is NOT on the Unraid host; use `docker exec -i quad-quad-1 python3`
  with heredoc-via-stdin. Example pattern used today:
  ```
  ssh -o BatchMode=yes -i ~/.ssh/id_rsa root@100.114.81.91 \
    "docker exec -i quad-quad-1 python3" << 'PYEOF'
  ...script...
  PYEOF
  ```
- ffmpeg/ffprobe ARE available in the quad container (used by pipeline).
- The bot logs at `docker compose -f /mnt/user/appdata/quad/docker-compose.yml
  logs --since 30m quad`.
- Helpful repo files:
  - `apps/quad/CLAUDE.md` -- module pattern + non-negotiable rules.
  - `apps/quad/OVERVIEW.md` -- module map.
  - `apps/quad/docker-compose.yml` -- mumble + quad service definitions.
  - `apps/quad/DEPLOYMENT.md` -- includes the new "Mumble TLS certificate"
    section from yesterday's cert work.
  - `apps/quad/cloudflare-worker/` -- the join.slipgate.me redirect Worker.
  - `contracts/completed/MUMBLE-INTEGRATION-CONTRACT.md` -- the team /
    bot / mumbleConfig data model.

## Verification regime

When (and only when) a root-cause hypothesis is confirmed and a fix is
proposed and operator approves: the acceptance test is a **fresh test
Mumble recording** that, when probed with `ffmpeg -t 60 -af volumedetect`,
shows max_volume materially above -91 dB (ideally above -40 dB for typical
speech) on at least one track during a period when speakers were active.
A fix that does not change the volumedetect signature does not count as
fixed. No "the code looks right" claims -- live-fire test or it didn't
happen.

## Operator preferences carried forward

- Plain English first at decision points; technical chain only where it
  carries decision content (operator memory entry
  `feedback_plain_english_at_decision_points`).
- One question at a time during Q/A (`feedback_one_question_at_a_time`).
- Be decisive on recommendations (`feedback_be_decisive`).
- Don't propose scope deferrals without explicit operator approval
  (CLAUDE.md verification discipline section).
- ASCII-only in code and shared docs (`feedback_output_discipline_sentiment`).
- The user does not touch git; Claude runs all git ops silently. Commit
  to main (no PR ceremony). Push at natural checkpoints.

## What this session did (for context)

The parent session that captured this handoff shipped (on 2026-05-19 and
2026-05-20) a stack of related Mumble UX work:

- matchscheduler nickname fix (`ce2595da`): embedded username in the
  returning-user mumble:// URL.
- Let's Encrypt cert for `mumble.slipgate.me` (`cb8f7932`): acme.sh
  sidecar + DNS-01 + reload hook.
- Auto-record UI fixes (`71737d6c`, `247fad97`): toast z-index, eager
  data load on modal open, bidirectional listener notifications,
  `reload-mumble.sh` now restarts quad too after cert renewal.
- Bandwidth bump 128 -> 192 kbit/s (`e3517aae`, then committed).
- Discord-shareable squad join links (`4f8e061a`): Cloudflare Worker at
  `join.slipgate.me/<slug>` + frontend share-URL button.
- Three parking docs:
  - `docs/superpowers/parking/2026-05-20-quad-discord-surfaces.md`
    (Discord Events + auto-topic + community feeds vision).
  - `docs/superpowers/parking/2026-05-20-quad-mumble-silent-recording-
    investigation.md` (this doc).

That work is shipped + stable; the only outstanding issue is what this
handoff investigates.

## Suggested first three actions for the new terminal

1. Read this whole doc.
2. `ls apps/quad/src/modules/mumble/` and skim the file list to orient on
   the receiver-side code.
3. Run a fresh `ffmpeg volumedetect` probe (using the pattern in "Tools +
   access") to **independently verify the -91 dB finding** on at least
   one track before trusting this handoff. Verification discipline: this
   doc is a hypothesis until you re-prove its load-bearing claim.

Then form a Phase-1 investigation plan and run it. Report back when you
have a root cause OR when you hit a wall and need operator input.

## Related parking / shipped work

- This session's commit history (recent, on main): `git log --oneline
  --since=2026-05-19`.
- Mumble integration contract: `contracts/completed/MUMBLE-INTEGRATION-
  CONTRACT.md`.
- quad DEPLOYMENT.md "Mumble TLS certificate" section (added 2026-05-19).
- HANDOVER.md "Future arcs" entry for the Discord-surface enhancements
  arc (companion idea, separately captured today).

## Resolution (2026-05-20, same session that captured this doc)

Three commits on main, in order:

1. `8c928ce1 debug(quad/mumble): instrument voice-receiver to fingerprint
   silent recordings` -- counters + first-3-packets byte0 log + session-end
   stats. First test session showed `packetsReceived: 0` over 27 seconds of
   active speech, which killed all "codec mismatch" hypotheses and pointed
   straight at "voice packets never reach the bot socket."
2. `04030c6b fix(quad/mumble): subscribe bot as channel listener so voice
   forwards from team channels` -- the load-bearing change. Bot was in
   Root (channel 0) while users record in team subchannels, and Mumble
   servers only forward voice to clients in the same/listening channel.
   Fix sends `UserState { listeningChannelAdd: [channelId] }` at session
   start and `listeningChannelRemove` at stop. Bot stays in Root, no
   visible move; Mumble desktop clients show "X started listening to your
   channel" text notifications (and an ear icon next to listener users)
   which the operator may mis-read as a join -- it isn't. The dep
   `@tf2pickup-org/mumble-protocol@^1.0.12` was lifted from transitive to
   direct in apps/quad/package.json.
3. `2fc5fc22 fix(quad/mumble): accept any target value for Opus voice
   packets` -- second-layer fix. After #2, packets started arriving
   (`packetsReceived: 567`) but `packetsParsed: 0`: byte0=0x83 means
   codec_type=4 (Opus, good) but target=3 (channel-listener forwarded,
   not in-channel speech). `parseVoicePacket` was requiring target==0.
   Relaxed to "Opus codec only, any target."

Third test was the acceptance gate: 651/651 packets routed, OGG bitrate
105 kbit/s (vs 2.6 kbit/s silence baseline), volumedetect max_volume
-1.0 dB / mean_volume -25.0 dB on `1-ParadokS.ogg` over 10.4s of speech.

## Carry-forwards / loose ends

- **Diagnostic instrumentation is still in the codebase.** It is cheap
  (counters + 3 INFO log lines per session start + 1 INFO log at stop)
  and provides useful future observability. Operator may choose to
  downgrade per-packet logs to debug-level later, or strip entirely. Not
  acted on yet.
- **The @tf2pickup-org/mumble-client lib has two parallel issues** that
  affect any future bot using it for voice receive: (1) `decodeAudio`
  discards the Opus payload entirely (we monkey-patch around this);
  (2) the lib's own target check uses `0b000111111 & packet[0] !== 0` so
  even listener-forwarded packets never emit `speakingStateChange`.
  Both are arguably upstream bugs; an upstream PR was not opened in this
  session. Captured for future consideration.
- **Old silent recordings on disk** (Feb 28, Mar 20, May 19 sessions in
  `/mnt/user/appdata/quad/recordings/`) are unrecoverable -- nothing was
  ever captured. No backfill possible.

## Memory update

`project_quad_mumble_silent_recording.md` (auto-memory) rewritten to
RESOLVED status with the root-cause story and fix commits, so future
sessions don't re-investigate.
