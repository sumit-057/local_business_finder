#!/usr/bin/env bash
# Fresh-session production smoke check (ticket #9).
cd /home/sumit/docx/local_business_finder || exit 1
PORT=3111
npm start -- -p $PORT > /tmp/smoke-server.log 2>&1 &
SRV=$!
sleep 4
fail=0

check() {
  local label=$1 expected=$2 got=$3
  if [ "$got" = "$expected" ]; then
    echo "PASS $label ($got)"
  else
    echo "FAIL $label: expected $expected, got $got"
    fail=1
  fi
}

echo "── pages ──"
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/)
check "home redirect" 307 "$code"
loc=$(curl -s -o /dev/null -w '%{redirect_url}' http://localhost:$PORT/)
echo "  -> $loc"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/search?q=salon%20in%20Pune")
check "search page" 200 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/place/node/5013924587)
check "place page" 200 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/place/castle/5)
check "invalid place is 404" 404 "$code"

echo "── api ──"
cc=$(curl -s -D - -o /dev/null 'http://localhost:'$PORT'/api/nearby?lat=18.5204&lon=73.8567&category=cafe' | grep -i '^cache-control:' | tr -d '\r')
if echo "$cc" | grep -q 's-maxage=60'; then
  echo "PASS nearby sets platform cache headers ($cc)"
else
  echo "FAIL nearby Cache-Control missing: $cc"
  fail=1
fi
body=$(curl -s -m 60 'http://localhost:'$PORT'/api/nearby?lat=18.5204&lon=73.8567&category=salon')
if echo "$body" | grep -q '"category":"Salon"'; then
  echo "PASS nearby returns Salon places ($(echo "$body" | head -c 120)...)"
else
  echo "FAIL nearby body: $body"
  fail=1
fi
code=$(curl -s -o /dev/null -w '%{http_code}' 'http://localhost:'$PORT'/api/nearby?lat=99&lon=73&category=salon')
check "nearby invalid coords" 400 "$code"
body=$(curl -s -m 60 'http://localhost:'$PORT'/api/search?q=cafe%20in%20Pune')
count=$(echo "$body" | grep -o '"id":"' | wc -l)
if [ "$count" -ge 5 ]; then
  echo "PASS search returns $count places"
else
  echo "FAIL search only returned $count places: $(echo "$body" | head -c 200)"
  fail=1
fi

kill $SRV 2>/dev/null
exit $fail
