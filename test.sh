#!/usr/bin/env bash
URL="http://localhost:3000/run"

BODY='{
  "url": "https://timeapi.io/api/Time/current/zone?timeZone=Europe/London"
}'

DIST=".xgsd"

curl -s \
  --request POST \
  --header "Content-Type: application/json" \
  --data "$BODY" \
  "$URL" > example/"$DIST"/output.json