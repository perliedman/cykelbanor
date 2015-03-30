var L = require('leaflet'),
    UrlHash = require('./url-hash');

module.exports = L.Class.extend({
    initialize: function(window) {
        this._window = window;
        this._hashState = UrlHash.parse(window.location.hash);
    },

    getWaypoints: function() {
        var encWps = this._hashState.wps;
        if (!encWps) {
            return undefined;
        }

        return encWps.split(';').map(function(s) {
            var parts = s.split(',')
                .map(function(p) { return parseFloat(p); })
                .filter(function(f) { return !isNaN(f); });
            if (parts.length === 2) {
                return L.latLng.apply(null, parts);
            } else {
                return undefined;
            }
        }).filter(function(wp) { return !!wp; });
    },

    setWaypoints: function(wps) {
        this._hashState.wps = wps
            .map(function(wp) {
                var ll = wp.latLng;
                return ll ? ll.lat.toFixed(4) + ',' + ll.lng.toFixed(4) : undefined;
            })
            .filter(function(s) {
                return !!s;
            })
            .join(';');
        this._updateHash();
    },

    getBaseLayer: function() {
        return this._hashState.bl;
    },

    setBaseLayer: function(name) {
        this._hashState.bl = name;
        this._updateHash();
    },

    getOverlays: function() {
        var ols = this._hashState.ols;
        return ols ? ols.split(';') : [];
    },

    addOverlay: function(name) {
        var overlays = this.getOverlays();
        if (overlays.indexOf(name) < 0) {
            overlays.push(name);
            this._hashState.ols = overlays.join(';');
            this._updateHash();
        }
    },

    removeOverlay: function(name) {
        var overlays = this.getOverlays(),
            i = overlays.indexOf(name);
        if (i >= 0) {
            overlays.splice(i, 1);
            this._hashState.ols = overlays.join(';');
            this._updateHash();
        }
    },

    _updateHash: function() {
        Object.keys(this._hashState).forEach(L.bind(function(k) {
            if (!this._hashState[k]) {
                delete this._hashState[k];
            }
        }, this));
        this._window.location.hash = '#' + UrlHash.encode(this._hashState);
    }
});
