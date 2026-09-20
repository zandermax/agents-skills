#!/usr/bin/env sh
set -e

# Resolve target directory following symlinks if any
TARGET="$0"
while [ -h "$TARGET" ]; do
  DIR="$(cd -P "$(dirname "$TARGET")" && pwd)"
  TARGET="$(readlink "$TARGET")"
  case "$TARGET" in
    /*) ;;
    *) TARGET="$DIR/$TARGET" ;;
  esac
done

SCRIPT_DIR="$(cd -P "$(dirname "$TARGET")" && pwd)"

exec node "$SCRIPT_DIR/deny-non-read-git.js"
