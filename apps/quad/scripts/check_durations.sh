#!/bin/sh
for f in $(find /app/recordings -name "*.ogg" -path "*/audio/*" | sort); do
  dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" 2>/dev/null)
  dirn=$(dirname "$(dirname "$f")")
  dirn=$(basename "$dirn")
  base=$(basename "$f")
  printf "%s\t%s/%s\n" "$dur" "$dirn" "$base"
done
