#!/bin/bash

cp -a node_modules/leaflet/dist/*.css assets/vendor/
cp -a node_modules/leaflet/dist/images assets/vendor/
cp -a node_modules/leaflet-editinosm/*.css assets/vendor/
cp -a node_modules/leaflet-routing-machine/dist/*.css assets/vendor/
cp -a node_modules/leaflet-routing-machine/dist/*.png assets/vendor/
cp -a node_modules/leaflet.markercluster/dist/*.css assets/vendor/
cp -a node_modules/font-awesome/css/*.min.css assets/vendor/

browserify -t hbsfy src/index.js >site.js
