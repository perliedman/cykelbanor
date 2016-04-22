var underneath = require('leaflet-underneath'),
    config = require('./config');

module.exports = new underneath('https://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
    '{z}/{x}/{y}.vector.pbf?access_token=' + config.mapboxToken, {
    layers: ['poi_label'],
    lazy: true,
    zoomIn: 2
});
