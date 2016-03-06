#!/bin/bash

./scripts/build.sh
watchify -t hbsfy -x opening_hours -x moment -x moment/locale/sv src/index.js -o site.js &
http-server
