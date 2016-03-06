#!/bin/bash

cp -a node_modules/leaflet/dist/*.css assets/vendor/
cp -a node_modules/leaflet/dist/images assets/vendor/
cp -a node_modules/leaflet-editinosm/*.css assets/vendor/
cp -a node_modules/leaflet-routing-machine/dist/*.css assets/vendor/
cp -a node_modules/leaflet-routing-machine/dist/*.png assets/vendor/
cp -a node_modules/leaflet.markercluster/dist/*.css assets/vendor/
cp -a node_modules/font-awesome/css/*.min.css assets/vendor/

browserify -t hbsfy -x opening_hours -x moment -x moment/locale/sv src/index.js >site.js
browserify -r opening_hours -r moment -r moment/locale/sv >module-osm-feature-details.js
