#!/usr/bin/env bash
cd /home/sumit/docx/local_business_finder || exit 1
PORT=3112
npm start -- -p $PORT > /tmp/smoke-server.log 2>&1 &
SRV=$!
sleep 4
echo "── fallback probe: 'software companies in Indore' ──"
curl -s -m 60 "http://localhost:$PORT/api/search?q=software%20companies%20in%20Indore" | head -c 400
echo
echo "── nearby all probe ──"
curl -s -m 90 "http://localhost:$PORT/api/nearby?lat=18.5204&lon=73.8567&category=all" | head -c 300
echo
code=$(curl -s -o /dev/null -w '%{http_code}' 'http://localhost:3112/search?q=salon%20in%20Pune')
echo "search page: $code"
kill $SRV 2>/dev/null
