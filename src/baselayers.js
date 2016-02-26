var L = require('leaflet'),
    config = require('./config');

module.exports = {
    'Karta': L.tileLayer('https://a.tiles.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}.png?access_token=' + config.mapboxToken, {
        attribution: 'Kartdata &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }),
    'Flygfoto': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Kartdata &copy; <a href="http://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    })
};
