#!/bin/sh
echo "=== 820c5451 (Book, Feb 11) ==="
for f in /app/recordings/820c5451-b9cc-49b3-883e-57c4ac03b742/*.ogg; do
  dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" 2>/dev/null)
  printf "%s\t%s\n" "$dur" "$(basename "$f")"
done

echo ""
echo "=== b59776ce (pol, Feb 13) ==="
for f in /app/recordings/b59776ce-66c4-4762-91a0-591d311d2ea2/*.ogg; do
  dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" 2>/dev/null)
  printf "%s\t%s\n" "$dur" "$(basename "$f")"
done
