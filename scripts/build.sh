#!/bin/bash

cp -a node_modules/leaflet/dist/*.css assets/vendor/
cp -a node_modules/leaflet/dist/images assets/vendor/
cp -a node_modules/leaflet-editinosm/*.css assets/vendor/
cp -a node_modules/leaflet-routing-machine/dist/*.css assets/vendor/
cp -a node_modules/leaflet-routing-machine/dist/*.png assets/vendor/

browserify -t hbsfy index.js >site.js
