var L = require('leaflet'),
    lrm = require('leaflet-routing-machine'),
    lcg = require('leaflet-control-geocoder'),
    eio = require('leaflet-editinosm'),
    RoutingControl = require('./routing-control'),
    userInfo = require('./user-info'),
    State = require('./state'),
    state = new State(window),
    initialWaypoints = state.getWaypoints(),
    Sortable = require('sortablejs'),
    geolocate = require('./geolocate'),
    locationPopup = require('./location-popup'),
    map = L.map('map', {
        attributionControl: false
    }),
    GeolocateControl = require('./geolocate-control'),
    baselayers = require('./baselayers'),
    overlays = require('./overlays'),
    layerControl = new L.Control.Layers(baselayers, overlays, { position: 'bottomleft' })
        .addTo(map),
    routingControl = new RoutingControl(map, initialWaypoints).addTo(map),
    sortable = Sortable.create(document.querySelector('.leaflet-routing-geocoders'), {
        handle: '.geocoder-handle',
        draggable: '.leaflet-routing-geocoder',
        onUpdate: function(e) {
            var oldI = e.oldIndex,
                newI = e.newIndex,
                wps = routingControl.getWaypoints(),
                wp = wps[oldI];

            if (oldI === newI || newI === undefined) {
                return;
            }

            wps.splice(oldI, 1);
            wps.splice(newI, 0, wp);
            routingControl.setWaypoints(wps);
        }
    }),
    poiLayer = require('./poi-layer')
        .addTo(map);

L.Icon.Default.imagePath = 'assets/vendor/images';

L.control.attribution({
    prefix: '<a href="/om/">Om cykelbanor.se</a>'
}).addTo(map);
new L.Control.EditInOSM({
    position: 'bottomright',
    widget: 'attributionbox'
}).addTo(map);

baselayers[state.getBaseLayer() || 'Karta'].addTo(map);
state.getOverlays().forEach(function(name) {
    overlays[name].addTo(map);
});

new GeolocateControl({ position: 'topleft' }).addTo(map);

map
    .on('baselayerchange', function(e) {
        state.setBaseLayer(e.name);
    })
    .on('overlayadd', function(e) {
        state.addOverlay(e.name);
    })
    .on('overlayremove', function(e) {
        state.removeOverlay(e.name);
    })
    .on('click', function(e) {
        locationPopup(routingControl, poiLayer, e.latlng).openOn(map);
    });

geolocate(map, function(err, p) {
        if (err) {
            map.fitBounds(L.latLngBounds([56,9.6],[68,26.6]));
            return;
        }

        if (!initialWaypoints || initialWaypoints.length < 2) {
            map.setView(p.latlng, Math.min(p.zoom, 14));
        }

        L.circleMarker(p.latlng, {
            radius: 4,
            fillOpacity: 0.8
        })
        .addTo(map);
    }, {
        timeout: 5000
    });

routingControl
    .on('waypointschanged', function() {
        state.setWaypoints(routingControl.getWaypoints());
    });

userInfo();
