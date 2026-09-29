#!/bin/bash
# Preview Brain.command — serve the Brain locally for a look-and-feel check.
# Double-click to run, then open http://localhost:8080  (Ctrl-C in the window stops it).
set -euo pipefail

REPO="$HOME/Movies/PROJECTS/Websites/EBW website"
BRAIN="$REPO/brain"

# Node 22 is keg-only under Homebrew, so put it ahead of any older node.
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

echo "Serving the Brain at http://localhost:8080 — press Ctrl-C to stop."
echo "(--serve also enables --watch, so saving a note or a .scss rebuilds live.)"
echo

# Why a script instead of a pasted command: macOS zsh has interactive_comments
# OFF, so a trailing "# http://localhost:8080" is passed to Quartz as arguments
# ("Unknown arguments: #, http://localhost:8080") rather than ignored.
cd "$BRAIN"
exec npx quartz build --serve --port 8080
