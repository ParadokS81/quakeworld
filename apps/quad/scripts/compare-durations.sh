#!/bin/bash
# Compare source track durations between Craig and Quad recordings of the same session

CRAIG_DIR="/home/paradoks/projects/quake/quad/recordings/2155a953-a5a2-5aec-b1a7-7bb177b546ee"
QUAD_DIR="/home/paradoks/projects/quake/quad/recordings/2e823379-bcd1-4143-b32e-b8f41ec8bf38"

echo "=== CRAIG Feb 11 (rqjRh2beRkqc, start 21:10:33) ==="
for f in "$CRAIG_DIR"/*.ogg; do
    dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" 2>/dev/null)
    echo "  $dur  $(basename "$f")"
done

echo ""
echo "=== QUAD Feb 11 (820c5451, start 21:08:18) ==="
echo "(Note: Quad session is on server, checking local copy if available)"

# Check if we have the Quad session locally
if [ -d "$QUAD_DIR" ]; then
    for f in "$QUAD_DIR"/*.ogg; do
        dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" 2>/dev/null)
        echo "  $dur  $(basename "$f")"
    done
else
    echo "  (not available locally — only on server)"
fi

echo ""
echo "=== ANALYSIS ==="
echo "Craig tracks should all have identical durations if silence injection is perfect."
echo "Quad tracks had ~5s spread over 2.4h (post-fix silence timer)."
