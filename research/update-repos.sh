#!/bin/bash
# Clone or update reference repos used for QW research
# These are gitignored — run this script to populate them

REPOS_DIR="$(dirname "$0")/repos"
mkdir -p "$REPOS_DIR"

declare -A REPOS=(
  ["mvdsv"]="https://github.com/QW-Group/mvdsv.git"
  ["ktx"]="https://github.com/QW-Group/ktx.git"
  ["hub.quakeworld.nu"]="https://github.com/quakeworldnu/hub.quakeworld.nu.git"
  ["vikpe-slipgate"]="https://github.com/vikpe/slipgate.git"
  ["mvdparser"]="https://github.com/vikpe/mvdparser.git"
  ["qwprot"]="https://github.com/niclaslaven/qwprot.git"
  ["slime-quake"]="https://github.com/vikpe/slime-quake.git"
  ["dusty-mvdsv"]="https://github.com/dusty-qw/mvdsv.git"
  ["dusty-ktx"]="https://github.com/dusty-qw/ktx.git"
  ["qwcl-original"]="https://github.com/id-Software/Quake.git"
  ["fteqw"]="https://github.com/fte-team/fteqw.git"
  ["ezquake-source"]="https://github.com/QW-Group/ezquake-source.git"
)

for name in "${!REPOS[@]}"; do
  dir="$REPOS_DIR/$name"
  if [ -d "$dir/.git" ]; then
    echo "Updating $name..."
    cd "$dir" && git pull --ff-only 2>/dev/null && cd - > /dev/null
  else
    echo "Cloning $name..."
    git clone "${REPOS[$name]}" "$dir"
  fi
done

echo "Done. All repos up to date."
