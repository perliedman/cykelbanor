#!/bin/bash

DATA_DIR=/home/per/Documents/geodata
DATA=$DATA_DIR/sweden
DATA_OSRM=$DATA.osrm

rsync -azv $DATA_OSRM* tinycat.liedman.net:/opt/osrm-data/
