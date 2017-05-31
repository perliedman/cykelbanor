var underneath = require('leaflet-underneath'),
    config = require('./config');

module.exports = function (map) {
	return new underneath('https://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
	    '{z}/{x}/{y}.vector.pbf?access_token=' + config.mapboxToken, map, {
	    layers: ['poi_label'],
	    lazy: true,
	    zoomIn: 2
	});
};
