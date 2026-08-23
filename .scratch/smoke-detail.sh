#!/usr/bin/env bash
cd /home/sumit/docx/local_business_finder || exit 1
PORT=3115
npm start -- -p $PORT > /tmp/smoke5.log 2>&1 &
SRV=$!
sleep 4
echo "── place detail: node/772571829 ──"
curl -s -m 40 "http://localhost:$PORT/api/place/node/772571829" | python3 -m json.tool | head -30
echo "── place detail: way (center coords path) ──"
curl -s -m 40 "http://localhost:$PORT/api/place/node/5013924587" | head -c 300
echo
kill $SRV 2>/dev/null
