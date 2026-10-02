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
#    Note: lowercase 'images' directory is used in content to match Quartz slug casing.
/usr/bin/rsync -a --delete \
  --exclude='.DS_Store' --exclude='_*' \
  "$IMAGES/" "$CONTENT/organise/images/newsletters/" || exit 1

# 3. Rewrite vault-relative image paths to absolute content-root paths with lowercase 'images'.
#    Vault notes sit 5 levels below the vault root:
#      Newsletters/<year>/<slug>.md → ../../../../../organise/Images/…
#    Quartz resolves root-relative (/organise/images/…) correctly at any page depth
#    (e.g., newsletters/2023/<slug> resolves to ../../organise/images/… in emitted HTML),
#    avoiding breakout bugs from directory traversal.
if grep -rq 'organise/[Ii]mages' "$CONTENT/Newsletters/" 2>/dev/null; then
  grep -rl 'organise/[Ii]mages' "$CONTENT/Newsletters/" 2>/dev/null | while IFS= read -r f; do
    /usr/bin/perl -pi -e 's{(\.\./)+organise/Images/}{/organise/images/}g; s{(\.\./)+organise/images/}{/organise/images/}g' "$f" || exit 1
  done
fi

# 4. Guard: every referenced filename must exist under content/organise/images/newsletters.
#    (Line-based loop: `for f in $REFS` word-splits multiline paths — fixed 2026-09-28.)
MISSING=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ ! -f "$CONTENT/organise/images/newsletters/$f" ]; then echo "MISSING IMAGE: $f"; MISSING=1; fi
done < <(grep -rho 'organise/images/newsletters/[^)"]*' "$CONTENT/Newsletters/" 2>/dev/null | sed 's/.*newsletters\///;s/[)"]$//' | sort -u)
if [ "$MISSING" = "1" ]; then echo "Publish aborted: missing images."; exit 1; fi

# 5. Enrich frontmatter with Quartz's date keys so the Brain shows real
#    publication dates instead of "today" for every mirrored note.
#      date:    -> created:   (archive + per-note date, newest-first sorting)
#      updated: -> modified:  (used by modified-date views)
#    Idempotent: a key is only added when it is missing, so re-running is a no-op.
find "$CONTENT/Newsletters" -name '*.md' -print0 | while IFS= read -r -d '' f; do
  if grep -q '^date:' "$f" && ! grep -q '^created:' "$f"; then
    /usr/bin/perl -pi -e 'if (/^date:\s*(\S+)/ && !$done) { $_ .= "created: $1\n"; $done = 1 }' "$f" || exit 1
  fi
  if grep -q '^updated:' "$f" && ! grep -q '^modified:' "$f"; then
    /usr/bin/perl -pi -e 'if (/^updated:\s*(\S+)/ && !$done) { $_ .= "modified: $1\n"; $done = 1 }' "$f" || exit 1
  fi
done

cd "$REPO" && git add -A
if git diff --cached --quiet; then
  echo "Nothing new to publish — the mirror is already up to date."
else
  git commit -m "Brain: publish $(date +%F)" && git push
fi
echo "Published."
