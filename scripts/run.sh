#!/bin/bash

./scripts/build.sh
watchify -t hbsfy src/index.js -o site.js &
http-server
