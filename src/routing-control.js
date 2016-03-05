var L = require('leaflet'),
    ElevationControl = require('./elevation'),
    geolocate = require('./geolocate'),
    reqwest = require('reqwest'),
    poiLayer = require('./poi-layer'),
    locationPopup = require('./location-popup');

require('leaflet-routing-machine');
require('leaflet.icon.glyph');

module.exports = L.Routing.Control.extend({
    initialize: function(map, initialWaypoints) {
        L.Routing.Control.prototype.initialize.call(this, {
            router: L.Routing.osrm({serviceUrl: 'http://route.cykelbanor.se/viaroute'}),
            //router: L.Routing.osrm({serviceUrl: 'http://localhost:5000/viaroute'}),
            geocoder: L.Control.Geocoder.mapzen('search-KwMCkXI'),
            routeWhileDragging: true,
            reverseWaypoints: true,
            language: 'sv',
            lineOptions: {
                styles: [
                    {color: 'black', opacity: 0.3, weight: 11},
                    {color: 'white', opacity: 0.9, weight: 9},
                    {color: 'red', opacity: 1, weight: 3}
                ]
            },
            waypoints: initialWaypoints,
            createMarker: function(i, wp) {
                return L.marker(wp.latLng, {
                    icon: L.icon.glyph({
                        prefix: '',
                        glyph: String.fromCharCode(65 + i)
                    }),
                    draggable: true
                })
            },
            createGeocoder: L.bind(function(i) {
                var geocoder = L.Routing.GeocoderElement.prototype.options.createGeocoder.call(this, i, this.getPlan().getWaypoints().length, this.getPlan().options),
                    handle = L.DomUtil.create('div', 'geocoder-handle'),
                    geolocateBtn = L.DomUtil.create('span', 'geocoder-geolocate-btn', geocoder.container);

                handle.innerHTML = String.fromCharCode(65 + i);
                geocoder.container.insertBefore(handle, geocoder.container.firstChild);

                geolocateBtn.title = 'Välj min position';
                geolocateBtn.innerHTML = '<i class="fa fa-location-arrow"></i>';
                L.DomEvent.on(geolocateBtn, 'click', L.bind(function() {
                    geolocate(map, L.bind(function(err, p) {
                        if (err) {
                            // TODO: error message
                            return;
                        }

                        this.spliceWaypoints(i, 1, p.latlng);
                    }, this));
                }, this));

                L.DomEvent.on(handle, 'click', function() {
                    var wp = this.getWaypoints()[i];
                    locationPopup(this, poiLayer, wp.latLng).openOn(this._map);
                }, this);

                return geocoder;
            }, this)
        });
        this.on('routeselected', function(e) {
            var r = e.route,
                geojson = {
                    type: 'LineString',
                    coordinates: r.coordinates.map(function(c) { return [c.lng, c.lat]; })
                };

            reqwest({
                url: 'http://data.cykelbanor.se/elevation/geojson',
                method: 'post',
                contentType: 'application/json',
                data: JSON.stringify(geojson),
            }).then(L.bind(function(resp) {
                this._elevationControl.clear();
                this._elevationControl.addData(resp);
            }, this));
        });
    },
    onAdd: function(map) {
        var container = L.Routing.Control.prototype.onAdd.call(this, map);
        this._elevationControl = new ElevationControl();
        container.appendChild(this._elevationControl.onAdd());

        return container;
    }
});
