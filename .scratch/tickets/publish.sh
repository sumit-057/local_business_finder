#!/usr/bin/env bash
set -euo pipefail
cd /home/sumit/docx/local_business_finder
REPO=sumit-057/local_business_finder
IDS=.scratch/tickets/ids.txt
rm -f "$IDS"; touch "$IDS"

field() { awk -v k="$1" '$1==k{print $2}' "$IDS"; }
dbid()  { awk -v k="$1" '$1==k{print $3}' "$IDS"; }

publish() {
  local key="$1"
  local title="$2"
  local file=".scratch/tickets/$key.md"
  local url num
  url=$(gh issue create --repo "$REPO" --title "$title" --body-file "$file" --label ready-for-agent)
  num=${url##*/}
  echo "$key $num $(gh api "repos/$REPO/issues/$num" --jq .id)" >> "$IDS"
  echo "created #$num <- $key ($title)"
}

publish t1 "Foundation: app scaffold + dark-premium design system"
publish t2 "Smart Query search end-to-end (/api/search to Place cards)"
publish t3 "Live map split-view synced with results list"
publish t4 "Detail slide-over with Overpass enrichment"
publish t5 "Near Me radius search"
publish t6 "Favorites and recent searches"
publish t7 "Command palette (Cmd/Ctrl+K)"
publish t8 "Motion, a11y & ship polish sweep"

for key in t1 t2 t3 t4 t5 t6 t7 t8; do
  num=$(field "$key")
  n=${key#t}
  for f in .scratch/tickets/t*.md; do
    sed -i -E "s/^- T$n$/- #$num/" "$f"
  done
done

edge() {
  local child="$1" blocker="$2"
  gh api --method POST "repos/$REPO/issues/$(field "$child")/dependencies/blocked_by" \
    -F "issue_id=$(dbid "$blocker")" >/dev/null \
    && echo "edge: #$(field "$blocker") blocks #$(field "$child")"
}

for pair in "t2 t1" "t3 t2" "t4 t2" "t5 t2" "t6 t2" "t6 t4" "t7 t6" "t8 t3" "t8 t4" "t8 t5" "t8 t7"; do
  edge $pair
done

echo "--- editing bodies with real numbers ---"
for key in t1 t2 t3 t4 t5 t6 t7 t8; do
  gh issue edit "$(field "$key")" --repo "$REPO" --body-file ".scratch/tickets/$key.md" >/dev/null \
    && echo "body updated: #$(( ${key#t} ))"
done
echo DONE
