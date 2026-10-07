#!/usr/bin/env sh
# Shell wrapper hook for PreToolUse safety enforcement. Resolves symlinks to find
# the canonical script directory and invokes pre-tool-safety.mts with tsx.
# pre-tool-safety.mts validates tool invocations against workspace boundaries and
# git/GitHub mutation safety policies before execution.
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

exec node --import tsx "$SCRIPT_DIR/pre-tool-safety.mts"
