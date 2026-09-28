#!/bin/bash
# Publish Brain.command — mirror vault → Quartz content, commit, push.
# Double-click to publish. Fails loudly on any error (set -euo).
set -euo pipefail

VAULT="$HOME/Documents/Obsidian/Nexus/projects/Stormhouse/Emerson Black"
IMAGES="$HOME/Documents/Obsidian/Nexus/organise/Images/newsletters"
REPO="$HOME/Movies/PROJECTS/Websites/EBW website"
CONTENT="$REPO/brain/content"

# 1. Mirror notes (drafts excluded: kept out of the repo AND hidden by ExplicitPublish)
#    --exclude='_*' drops _drafts/ at any depth.
/usr/bin/rsync -a --delete \
  --exclude='.DS_Store' --exclude='_*' \
  "$VAULT/Newsletters/" "$CONTENT/Newsletters/" || exit 1

# 2. Mirror newsletter images alongside the notes so Quartz can serve them.
#    Draft images (_drafts/) are never mirrored — same rule as draft notes.
/usr/bin/rsync -a --delete \
  --exclude='.DS_Store' --exclude='_*' \
  "$IMAGES/" "$CONTENT/organise/Images/newsletters/" || exit 1

# 3. Rewrite vault-relative image paths for the shallower content tree.
#    Vault notes sit 5 levels below the vault root:
#      Newsletters/<year>/<slug>.md → ../../../../../organise/…
#    Mirrored notes sit 2 levels below content/:
#      content/Newsletters/<year>/<slug>.md → ../../../organise/…
#    One substitution covers body ![]() refs and frontmatter `cover:` alike.
if grep -rq '\.\./\.\./\.\./\.\./\.\./organise' "$CONTENT/Newsletters/" 2>/dev/null; then
  grep -rl '\.\./\.\./\.\./\.\./\.\./organise' "$CONTENT/Newsletters/" 2>/dev/null | while IFS= read -r f; do
    /usr/bin/perl -pi -e 's{\.\./\.\./\.\./\.\./\.\./organise}{../../../organise}g' "$f" || exit 1
  done
fi

# 4. Guard: every referenced filename must exist under content/organise.
#    (Line-based loop: `for f in $REFS` word-splits multiline paths — fixed 2026-09-28.)
MISSING=0
while IFS= read -r f; do
  if [ ! -f "$CONTENT/organise/Images/newsletters/$f" ]; then echo "MISSING IMAGE: $f"; MISSING=1; fi
done < <(grep -rho 'organise/Images/newsletters/[^)"]*' "$CONTENT/Newsletters/" 2>/dev/null | sed 's/.*newsletters\///;s/[)"]$//' | sort -u)
if [ "$MISSING" = "1" ]; then echo "Publish aborted: missing images."; exit 1; fi

cd "$REPO" && git add -A && git commit -m "Brain: publish $(date +%F)" && git push
echo "Published."
