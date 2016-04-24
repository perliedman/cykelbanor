#!/bin/bash

DATA_DIR=/home/per/Documents/geodata
DATA=$DATA_DIR/sweden.osm.pbf

wget -O $DATA http://download.geofabrik.de/europe/sweden-latest.osm.pbf

./scripts/prepare-data.sh
./scripts/sync-data.sh
