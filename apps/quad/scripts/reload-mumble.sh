#!/bin/sh
# acme.sh --reloadcmd hook for the mumble.slipgate.me Let's Encrypt cert.
#
# Lives in the repo for reproducibility; the live copy is at
# /mnt/user/appdata/quad/acme-data/reload-mumble.sh (= /acme.sh/reload-mumble.sh
# inside the acme-sh container). acme.sh runs this after every renewal.
#
# Steps:
#   1. Renewed cert files land root-owned in /certs. murmur runs as uid 10000
#      and must be able to read them.
#   2. Restart mumble-server so murmur picks up the new cert.
#   3. Restart quad too. quad's persistent Mumble TCP connection does NOT
#      survive a mumble-server restart cleanly (observed 2026-05-19: the bot
#      held a stuck recording session for ~14 hours with "socket not writable"
#      spam until a manual restart cleared it). Cycling both containers on
#      every renewal masks that fragility -- pragmatic for a community bot
#      until quad's Mumble client lib gets proper auto-reconnect handling.
#
# NOTE: both restarts go through the Docker socket and therefore BYPASS the
# quad recording-safety hook. Renewals fire at acme's nightly cron near the
# ARI window (~Jul 19 2026, then ~90-day cycle); collision with a live match
# recording is unlikely but possible. Let's Encrypt also emails the account
# address if a renewal fails near expiry (backstop).
set -e
chown 10000:10000 /certs/fullchain.pem /certs/privkey.pem
chmod 644 /certs/fullchain.pem
chmod 600 /certs/privkey.pem
curl -s -o /dev/null -w 'mumble restart -> HTTP %{http_code}\n' \
  --unix-socket /var/run/docker.sock \
  -X POST http://localhost/containers/mumble-server/restart
# Give murmur a moment to bind 64738 before quad reconnects. quad has its own
# startup retry loop, so this is belt-and-suspenders; 3s is enough in practice.
sleep 3
curl -s -o /dev/null -w 'quad   restart -> HTTP %{http_code}\n' \
  --unix-socket /var/run/docker.sock \
  -X POST http://localhost/containers/quad-quad-1/restart
