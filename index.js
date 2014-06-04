var L = require('leaflet'),
    lrm = require('leaflet-routing-machine'),
    lcg = require('leaflet-control-geocoder'),
    eio = require('Leaflet.EditInOSM'),
    addressPopup = require('./templates/address-popup.hbs'),
    address = require('./address'),
    userInfo = require('./user-info'),
    map = L.map('map', {
        editInOSMControlOptions: {position: 'bottomright', widget: 'attributionBox'}
    }),
    routingControl = L.Routing.control({
        router: L.Routing.osrm({serviceUrl: 'http://tinycat.liedman.net/viaroute'}),
    	geocoder: L.Control.Geocoder.nominatim()
    }).addTo(map);


L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images';

L.tileLayer('https://a.tiles.mapbox.com/v3/liedman.ib8andc2/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

map.on('click', function(e) {
    var $content = $(addressPopup()),
        name;


    L.popup().
        setLatLng(e.latlng).
        setContent($content[0]).
        openOn(map);

    L.Control.Geocoder.nominatim().reverse(e.latlng, map.options.crs.scale(18), function(r) {
        if (r && r[0]) {
            name = address(r[0]);
            $content.find('[data-address]').html(name.html);
        }
    });

    $content.find('[data-from]').click(function() {
        routingControl.spliceWaypoints(0, 1, {
            latLng: e.latlng,
            name: name && name.text ? name.text : ''
        });
        map.closePopup();
    });
    $content.find('[data-to]').click(function() {
        routingControl.spliceWaypoints(routingControl.getWaypoints().length - 1, 1, {
            latLng: e.latlng,
            name: name && name.text ? name.text : ''
        });
        map.closePopup();
    });
});

map.on('locationerror', function() {
    map.fitBounds(L.latLngBounds([55.3,9.6],[69.3,26.6]));
});

map.locate({
    setView: true,
    timeout: 1000
});

userInfo();
