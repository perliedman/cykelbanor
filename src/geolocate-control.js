var L = require('leaflet'),
    geolocate = require('./geolocate');

module.exports = L.Control.extend({
    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-bar'),
            link = L.DomUtil.create('a', 'geolocate-btn', container);

        link.title = 'Gå till nuvarande position';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(link, 'click', function(e) {
            geolocate(map, function(err, p) {
                if (err) {
                    // TODO: error message
                    return;
                }

                map.setView(p.latlng, Math.min(p.zoom, 14));
            });

            L.DomEvent.preventDefault(e);
        });

        return container;
    },
});
