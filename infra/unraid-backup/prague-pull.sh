#!/usr/bin/env bash
# Prague offsite pull: rsync the encrypted borg repo from Synology over
# Tailscale, then run an independent `borg check --verify-data` on the
# local copy. This is the third leg of the 3-2-1 layout (Unraid source +
# Synology copy + Prague offsite).
#
# Repo is content-addressed chunks -> plain rsync is incremental,
# resumable, and safe (rsync sees the file/chunk-name graph without
# decrypting anything). Prague treats its copy as READ-ONLY: only
# `borg check` and `borg extract` ever read it; never `borg create`,
# never `rsync push`.
#
# Reachability check first: if Synology is unreachable (Prague offline,
# laptop closed, ISP outage), exit 0 cleanly. The "intermittent target"
# design means a single later run reconciles every missed nightly
# archive in one pass.
#
# Env contract:
#   BORG_PASSPHRASE       -- escrowed repo passphrase (REQUIRED for borg check)
#                            Read from ~/.config/borg/passphrase (mode 600) if unset.
#
# Resolved parameters (see infra/unraid-backup/README.md):
#   SYN_SSH       = borg-unraid@100.112.91.72  (Synology Tailscale IP)
#   SYN_REPO      = /volume1/backup/borg-appdata
#   PRAGUE_REPO   = /mnt/d/Backups/borg-appdata  (WSL view of D:\Backups\borg-appdata)
#
# Auth model: Prague uses a SECOND SSH key on Synology's borg-unraid user --
# the key has the `restrict` keyword (blocks pty / port-fwd / agent / X11)
# but no forced command (rsync needs a plain shell session). Decision +
# trade-off documented in README's "Phase 5 execution findings". Compared
# to a separate borg-prague user with read-only ACLs (Option A) or an
# rrsync-restricted forced command (Option B), this trades a small amount
# of theoretical read-only-ness for operational simplicity, on the basis
# that Prague is the operator's own dev laptop on Tailscale.
#
# Scheduler hookup:
#   Windows Task Scheduler -> daily 13:00 CET -> action:
#     wsl -d <distro> bash -lc '/mnt/c/.../infra/unraid-backup/prague-pull.sh'
#   (Passphrase resolved from ~/.config/borg/passphrase; no env needed in Task action.)

set -euo pipefail

# --- resolved parameters -------------------------------------------------------

SYN_SSH="borg-unraid@100.112.91.72"
SYN_REPO="/volume1/backup/borg-appdata"
LOCAL="/mnt/d/Backups/borg-appdata"
LOG="${HOME}/.local/state/prague-borg-pull.log"

# --- passphrase resolution -----------------------------------------------------

if [[ -z "${BORG_PASSPHRASE:-}" ]]; then
  PASS_FILE="${HOME}/.config/borg/passphrase"
  if [[ -r "$PASS_FILE" ]]; then
    # printf-style read avoids dragging in a trailing newline if the file has one
    BORG_PASSPHRASE=$(< "$PASS_FILE")
    # Strip a possible trailing newline (defensive -- borg is sensitive to it)
    BORG_PASSPHRASE="${BORG_PASSPHRASE%$'\n'}"
  else
    echo "ERROR: BORG_PASSPHRASE unset and no $PASS_FILE found. Aborting." >&2
    exit 2
  fi
fi
export BORG_PASSPHRASE

# --- setup ---------------------------------------------------------------------

mkdir -p "$(dirname "$LOG")" "$LOCAL"

ts() { date '+%F %T'; }

# Everything from here writes to $LOG (and that's where the monthly health
# check reads the tail). Group-redirect keeps the structure compact.
{
  echo ""
  echo "$(ts) === prague-pull start ==="

  # Reachability gate -- a clean ssh handshake is the surest reachability proof
  # (works through Tailscale's WireGuard tunnel; no dependency on tailscale-cli
  # ping syntax which varies across releases). BatchMode=yes blocks any prompt.
  if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${SYN_SSH}" exit 2>/dev/null; then
    echo "$(ts) synology unreachable (offline path) -- will catch up next run"
    exit 0
  fi

  echo "$(ts) synology reachable; starting rsync"

  # --archive   preserves mtimes, permissions, etc (borg files care about mtime
  #             only loosely, but symmetry never hurts).
  # --delete    prunes chunks that upstream borgmatic dropped via keep_* retention.
  # --partial   keeps half-transferred files on interruption -- resumable.
  # --info=stats1   end-of-transfer one-liner stats; quiet otherwise.
  rsync -a --delete --partial --info=stats1 \
    -e "ssh -o BatchMode=yes" \
    "${SYN_SSH}:${SYN_REPO}/" "${LOCAL}/"

  echo "$(ts) rsync done; running borg check --verify-data on local copy"

  # Independent integrity check of the OFFSITE copy. --verify-data does a
  # full chunk-content verification (decrypts + hashes every chunk),
  # catching bitrot or a corrupted rsync. On a 38 GB repo over local
  # NVMe this is a few minutes; fine for daily cadence. If repo grows
  # past ~200 GB, demote this to weekly and run plain `borg check`
  # (metadata-only) on the other days.
  if borg check --verify-data "${LOCAL}"; then
    echo "$(ts) === prague-pull OK + borg check passed ==="
  else
    echo "$(ts) === BORG CHECK FAILED on offsite copy ==="
    # Non-zero exit signals the scheduler. Operator should investigate
    # before the next pull (a failed --verify-data means corruption,
    # not a transient error).
    exit 1
  fi
} >> "$LOG" 2>&1
