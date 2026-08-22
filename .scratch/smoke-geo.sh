#!/usr/bin/env bash
cd /home/sumit/docx/local_business_finder || exit 1
PORT=3113
npm start -- -p $PORT > /tmp/smoke3.log 2>&1 &
SRV=$!
sleep 4
echo "── home (location-first landing) ──"
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:$PORT/"
echo "── geo via egress IP ──"
curl -s -m 20 "http://localhost:$PORT/api/geo" | head -c 220
echo
echo "── geo with public IP header ──"
curl -s -m 20 -H 'x-forwarded-for: 8.8.8.8' "http://localhost:$PORT/api/geo" | head -c 220
echo
kill $SRV 2>/dev/null
