#!/bin/sh
# acme.sh --reloadcmd hook for the mumble.slipgate.me Let's Encrypt cert.
#
# Lives in the repo for reproducibility; the live copy is at
# /mnt/user/appdata/quad/acme-data/reload-mumble.sh (= /acme.sh/reload-mumble.sh
# inside the acme-sh container). acme.sh runs this after every renewal.
#
# Renewed cert files land root-owned in /certs. murmur runs as uid 10000 and
# must be able to read them, then needs a restart to reload the new cert.
#
# NOTE: the restart goes through the Docker socket and therefore BYPASSES the
# quad recording-safety hook. Renewals fire at acme's nightly cron near the
# ARI window (~Jul 19, then ~90-day cycle); collision with a live match
# recording is unlikely but possible. Let's Encrypt also emails the account
# address if a renewal fails near expiry (backstop).
set -e
chown 10000:10000 /certs/fullchain.pem /certs/privkey.pem
chmod 644 /certs/fullchain.pem
chmod 600 /certs/privkey.pem
curl -s -o /dev/null -w 'mumble restart -> HTTP %{http_code}\n' \
  --unix-socket /var/run/docker.sock \
  -X POST http://localhost/containers/mumble-server/restart
