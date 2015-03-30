var L = require('leaflet');

require('leaflet.markercluster');

var MarkerLayer = L.Class.extend({
    initialize: function(url, options) {
        L.setOptions(this, options);
        this._url = url;
    },
    onAdd: function(map) {
        if (!this._markerCluster) {
            $.getJSON(this._url, L.bind(function(data) {
                this._markerCluster = new L.MarkerClusterGroup(this.options)
                    .addLayers(data.features.map(L.bind(function(f) {
                        var c = f.geometry.coordinates;
                        return L.marker([c[1], c[0]], { icon: this.options.icon })
                            .bindPopup(this.options.popupTemplate(f));
                    }, this)))
                    .addTo(map);
            }, this));
        } else {
            this._markerCluster.addTo(map);
        }
    },
    onRemove: function(map) {
        map.removeLayer(this._markerCluster);
    },
    addTo: function(map) {
        map.addLayer(this);
        return this;
    }
});

module.exports = {
    'Hyrcyklar': new MarkerLayer('assets/data/bicycle-rental.json', {
        popupTemplate: require('../templates/bicycle-rental.hbs'),
        icon: L.icon({
            iconUrl: 'assets/images/marker-bicycle.png',
            iconSize: [23, 28],
            iconAnchor: [11, 26],
            popupAnchor: [0, -24]
        })
    })
};
