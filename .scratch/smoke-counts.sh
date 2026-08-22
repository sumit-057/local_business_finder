#!/usr/bin/env bash
# Live probe: comprehensive category search counts.
cd /home/sumit/docx/local_business_finder || exit 1
PORT=3114
npm start -- -p $PORT > /tmp/smoke4.log 2>&1 &
SRV=$!
sleep 4

count() {
  local q=$1
  curl -s -m 60 "http://localhost:$PORT/api/search?q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$q")" \
    | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('places',[])),'|',d.get('category'),'|',[p['name'] for p in d.get('places',[])][:3])"
}

echo "salon in Pune      -> $(count 'salon in Pune')"
echo "cafes in Pune      -> $(count 'cafes in Pune')"
echo "software companies in Indore -> $(count 'software companies in Indore')"
kill $SRV 2>/dev/null
