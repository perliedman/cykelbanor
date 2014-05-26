var L = require('leaflet'),
    lrm = require('leaflet-routing-machine'),
    lcg = require('leaflet-control-geocoder'),
    map = L.map('map');

L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images';

L.tileLayer('https://a.tiles.mapbox.com/v3/liedman.ib8andc2/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.Routing.control({
    router: L.Routing.osrm({serviceUrl: 'http://tinycat.liedman.net/viaroute'}),
	waypoints: [
		L.latLng(57.74, 11.94),
		L.latLng(57.6792, 11.949)
	],
	geocoder: L.Control.Geocoder.nominatim()
}).addTo(map);
