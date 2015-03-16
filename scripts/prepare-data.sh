#!/bin/bash

OSRM_DIR=/home/per/Documents/Projects/osrm-backend/build
DATA_DIR=/home/per/Documents/geodata
DATA=$DATA_DIR/sweden
DATA_OSM=$DATA.osm.pbf
DATA_OSRM=$DATA.osrm
PROFILE=./config/bicycle.lua

$OSRM_DIR/osrm-extract -p $PROFILE $DATA_OSM && $OSRM_DIR/osrm-prepare -p $PROFILE $DATA_OSRM
