#!/usr/bin/env bash
set -uo pipefail
cd /home/sumit/docx/local_business_finder
npm run start -- -p 3111 >/tmp/next.log 2>&1 &
SERVER_PID=$!
sleep 4
echo "--- /api/search ---"
curl -s "http://localhost:3111/api/search?q=salon%20in%20Pune" | head -c 500
echo
echo "--- cache headers ---"
curl -s -I "http://localhost:3111/api/search?q=cafes%20in%20Pune" | grep -i cache-control
echo "--- root redirect ---"
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "http://localhost:3111/"
kill $SERVER_PID 2>/dev/null
