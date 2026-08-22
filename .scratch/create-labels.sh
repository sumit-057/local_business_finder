#!/usr/bin/env bash
set -uo pipefail
cd /home/sumit/docx/local_business_finder
while IFS='|' read -r name desc; do
  [[ -z "$name" ]] && continue
  gh label create "$name" --description "$desc" --color 5319e7 2>/dev/null || echo "label $name exists"
done <<'EOF'
needs-triage|Maintainer needs to evaluate this issue
needs-info|Waiting on reporter for more information
ready-for-agent|Fully specified, ready for an AFK agent
ready-for-human|Requires human implementation
wontfix|Will not be actioned
EOF
