#!/bin/sh
# Local mvdsv + KTX test server -- gitignored rig, sibling to the ezquake/ dump client.
# Reuses this dir's id1/ + qw/. Swap ./mvdsv to test another build, or pass one as $2.
#   ./run-server.sh [map] [/path/to/mvdsv]
# Connect ezquake (Windows) to  <WSL eth0 IP>:27500   (find it: ip -4 addr show eth0)
# rcon password: test123  (sv_crypt_rcon 0; sv_rconlim raised for scripted rcon)
HERE=$(cd "$(dirname "$0")" && pwd)
MAP="${1:-dm6}"
BIN="${2:-$HERE/mvdsv}"
exec "$BIN" -basedir "$HERE" -game ktx +exec server.cfg +map "$MAP"
