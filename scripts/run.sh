#!/bin/bash

./scripts/build.sh
watchify -t hbsfy index.js -o site.js &
http-server
