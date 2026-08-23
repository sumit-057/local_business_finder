#!/usr/bin/env bash
cd /home/sumit/docx/local_business_finder || exit 1
PORT=3116
npm start -- -p $PORT > /tmp/smoke6.log 2>&1 &
SRV=$!
sleep 4
curl -s -m 60 "http://localhost:$PORT/api/search?q=cafes%20in%20Pune" > /tmp/cafes.json
python3 << 'EOF'
import json
d = json.load(open('/tmp/cafes.json'))
places = d.get('places', [])
withinfo = [p for p in places if p.get('enrichment') and (p['enrichment'].get('phone') or p['enrichment'].get('website') or p['enrichment'].get('openingHours'))]
print('total places:', len(places), '| with contact info:', len(withinfo))
for p in withinfo[:3]:
    print('-', p['name'], '->', json.dumps(p['enrichment'])[:140])
EOF
kill $SRV 2>/dev/null
