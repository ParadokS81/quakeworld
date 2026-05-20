/**
 * MumbleTrack — per-speaker OGG/Opus file writer for Mumble recordings.
 *
 * Adapted from src/modules/recording/track.ts with two key differences:
 *   1. channelCount: 1 (Mumble is mono; Discord is stereo)
 *   2. No DAVE/Opus corruption check needed — Mumble server decrypts
 *      OCB-AES128 before we see frames. Clean passthrough guaranteed.
 *
 * Silence padding strategy is identical to Discord:
 *   - Prepend silence for late joiners (align to recording start time)
 *   - Timer fills gaps with silent Opus frames during speech pauses
 *   - framesWritten counter tracks expected vs actual frames to avoid drift
 */

import { createWriteStream, statSync, type WriteStream } from 'node:fs';
import { once } from 'node:events';
import prism from 'prism-media';
import { logger } from '../../core/logger.js';
import { SILENT_OPUS_FRAME, FRAME_DURATION_MS } from '../recording/silence.js';

/**
 * Decode an Opus packet's playback duration from its TOC byte (RFC 6716 sec 3.1).
 *
 * Mumble desktop clients negotiate frame sizes per audio-quality setting; the
 * QW Voice Server's default is 10ms (config 30 = CELT-FB 10ms), but real users
 * may send other sizes. We need to count REAL audio time per packet (not just
 * "+1 frame") so the silence-timer math stays aligned with wall-clock; otherwise
 * each 10ms real packet causes 10ms of silence padding to get skipped, and the
 * OGG timeline compresses relative to wall-clock by exactly the total speech
 * duration per track.
 *
 * Returns FRAME_DURATION_MS as a safe fallback for unparseable packets.
 */
function opusPacketDurationMs(packet: Buffer): number {
  if (packet.length < 1) return FRAME_DURATION_MS;
  const toc = packet[0];
  const config = (toc >> 3) & 0x1f;
  const c = toc & 0x03;

  // Frame size (in tenths of milliseconds, so we can keep integer arithmetic
  // through CELT's 2.5ms case). Index = config. RFC 6716 Table 2.
  //                    SILK-NB              SILK-MB              SILK-WB              Hybrid              CELT-NB         CELT-WB         CELT-SWB        CELT-FB
  const frameTenthsMs = [100, 200, 400, 600, 100, 200, 400, 600, 100, 200, 400, 600, 100, 200, 100, 200, 25, 50, 100, 200, 25, 50, 100, 200, 25, 50, 100, 200, 25, 50, 100, 200];
  const baseTenthsMs = frameTenthsMs[config];

  let frameCount = 1;
  if (c === 1 || c === 2) {
    frameCount = 2;
  } else if (c === 3 && packet.length >= 2) {
    // Code 3 packets carry their frame count in the next byte's low 6 bits.
    frameCount = packet[1] & 0x3f;
    if (frameCount === 0) frameCount = 1;
  }

  return (baseTenthsMs * frameCount) / 10;
}

export interface MumbleTrackMetadata {
  track_number: number;
  mumble_session_id: number;
  mumble_username: string;
  discord_user_id: string | null;
  discord_username: string | null;
  joined_at: string;
  left_at: string | null;
  audio_file: string;
}

export class MumbleTrack {
  readonly trackNumber: number;
  readonly sessionId: number;         // Mumble session ID (ephemeral per-connection)
  readonly username: string;          // Mumble username = QW display name
  readonly mumbleUserId: number;      // Murmur registered user ID (0 if anonymous)
  readonly filePath: string;
  readonly audioFile: string;
  readonly joinedAt: Date;
  leftAt: Date | null = null;

  // Discord link (optional — populated if user has linked their accounts)
  discordUserId: string | null = null;
  discordUsername: string | null = null;

  private oggStream: prism.opus.OggLogicalBitstream;
  private fileStream: WriteStream;
  private silenceTimer: ReturnType<typeof setInterval> | null = null;
  // Total audio milliseconds written to the OGG stream so far (real packets
  // contribute their actual decoded duration; silent frames contribute
  // FRAME_DURATION_MS). The silence timer compares this against wall-clock
  // elapsed to know how much silence to pad with.
  private audioMsWritten = 0;
  private trackStartTime = 0;
  private recordingStartTime: Date;
  private failed = false;

  constructor(opts: {
    trackNumber: number;
    sessionId: number;
    username: string;
    mumbleUserId: number;
    outputDir: string;
    recordingStartTime: Date;
    discordUserId?: string | null;
    discordUsername?: string | null;
  }) {
    this.trackNumber = opts.trackNumber;
    this.sessionId = opts.sessionId;
    this.username = opts.username;
    this.mumbleUserId = opts.mumbleUserId;
    this.joinedAt = new Date();
    this.recordingStartTime = opts.recordingStartTime;
    this.discordUserId = opts.discordUserId ?? null;
    this.discordUsername = opts.discordUsername ?? null;

    this.audioFile = `${opts.trackNumber}-${opts.username}.ogg`;
    this.filePath = `${opts.outputDir}/${this.audioFile}`;

    // Mono (channelCount=1) — Mumble sends mono Opus (Discord sends stereo)
    this.oggStream = new prism.opus.OggLogicalBitstream({
      opusHead: new prism.opus.OpusHead({
        channelCount: 1,
        sampleRate: 48000,
      }),
      pageSizeControl: { maxPackets: 10 },
      crc: true,
    });

    this.fileStream = createWriteStream(this.filePath);

    this.fileStream.on('error', (err) => {
      logger.error(`Mumble track ${this.trackNumber} file error (${this.username})`, {
        error: err.message,
        filePath: this.filePath,
      });
      this.closeOnError();
    });

    this.oggStream.on('error', (err) => {
      logger.error(`Mumble track ${this.trackNumber} OGG error (${this.username})`, {
        error: err.message,
      });
      this.closeOnError();
    });

    this.oggStream.pipe(this.fileStream);

    logger.debug(`Mumble track ${this.trackNumber} created: ${this.audioFile}`, {
      sessionId: this.sessionId,
      username: this.username,
    });
  }

  get isFailed(): boolean {
    return this.failed;
  }

  /** Begin recording. Pads silence for late joiners and starts the silence timer. */
  start(): void {
    if (this.failed) return;

    // Align to recording start: prepend silent frames if user joined late
    const gapMs = this.joinedAt.getTime() - this.recordingStartTime.getTime();
    if (gapMs > FRAME_DURATION_MS) {
      const silentFrames = Math.floor(gapMs / FRAME_DURATION_MS);
      for (let i = 0; i < silentFrames; i++) {
        this.oggStream.write(SILENT_OPUS_FRAME);
      }
      this.audioMsWritten += silentFrames * FRAME_DURATION_MS;
      logger.debug(`Mumble track ${this.trackNumber} prepended ${silentFrames} silent frames (${gapMs}ms gap)`, {
        username: this.username,
      });
    }

    this.trackStartTime = this.recordingStartTime.getTime();

    // Silence filler: runs on every FRAME_DURATION_MS tick. Computes the
    // current shortfall in audio milliseconds vs wall-clock elapsed, then
    // writes that many silent frames (each FRAME_DURATION_MS long). Real
    // packets contribute their actual decoded duration via writeOpusFrame so
    // the OGG's internal timeline tracks wall-clock 1:1 -- without the
    // ms-aware accounting, 10ms Mumble packets would each cause 10ms of
    // silence padding to be skipped, drifting the OGG behind wall-clock by
    // the total speech duration per track.
    this.silenceTimer = setInterval(() => {
      if (this.failed) return;

      const totalElapsedMs = Date.now() - this.trackStartTime;
      const deficitMs = totalElapsedMs - this.audioMsWritten;
      const silentFrames = Math.max(0, Math.floor(deficitMs / FRAME_DURATION_MS));

      for (let i = 0; i < silentFrames; i++) {
        this.oggStream.write(SILENT_OPUS_FRAME);
      }
      this.audioMsWritten += silentFrames * FRAME_DURATION_MS;
    }, FRAME_DURATION_MS);

    logger.debug(`Mumble track ${this.trackNumber} started`, { username: this.username });
  }

  /** Write a real Opus frame from a Mumble voice packet. */
  writeOpusFrame(opusData: Buffer): void {
    if (this.failed) return;
    this.audioMsWritten += opusPacketDurationMs(opusData);
    this.oggStream.write(opusData);
  }

  private closeOnError(): void {
    if (this.failed) return;
    this.failed = true;

    logger.warn(`Mumble track ${this.trackNumber} (${this.username}) closed due to error`, {
      sessionId: this.sessionId,
    });

    if (this.silenceTimer) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  async stop(): Promise<void> {
    this.leftAt = new Date();

    if (this.silenceTimer) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.failed) {
      logger.info(`Mumble track ${this.trackNumber} stopped (was failed): ${this.audioFile}`, {
        username: this.username,
      });
      return;
    }

    this.oggStream.end();

    if (!this.fileStream.writableFinished) {
      await once(this.fileStream, 'finish');
    }

    let fileSize = '';
    try {
      const stats = statSync(this.filePath);
      const mb = (stats.size / (1024 * 1024)).toFixed(1);
      const kb = (stats.size / 1024).toFixed(0);
      fileSize = stats.size > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
    } catch {
      // File may not exist if track failed early
    }

    logger.info(`Mumble track ${this.trackNumber} stopped: ${this.audioFile}${fileSize ? ` (${fileSize})` : ''}`, {
      username: this.username,
      sessionId: this.sessionId,
    });
  }

  getMetadata(): MumbleTrackMetadata {
    return {
      track_number: this.trackNumber,
      mumble_session_id: this.sessionId,
      mumble_username: this.username,
      discord_user_id: this.discordUserId,
      discord_username: this.discordUsername,
      joined_at: this.joinedAt.toISOString(),
      left_at: this.leftAt?.toISOString() ?? null,
      audio_file: this.audioFile,
    };
  }
}
