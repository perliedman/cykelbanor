var L = require('leaflet'),
    lrm = require('leaflet-routing-machine'),
    lcg = require('leaflet-control-geocoder'),
    eio = require('Leaflet.EditInOSM'),
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
    var content = L.DomUtil.create('div', ''),
        address = L.DomUtil.create('div', 'address', content),
        list = L.DomUtil.create('ul', 'alternatives', content),
        fromHere = L.DomUtil.create('button', '', L.DomUtil.create('li', '', list)),
        toHere = L.DomUtil.create('button', '', L.DomUtil.create('li', '', list));

    L.Control.Geocoder.nominatim().reverse(e.latlng, map.options.crs.scale(18), function(r) {
        if (r && r[0]) {
            address.innerText = r[0].name;
        }
    });

    fromHere.setAttribute('type', 'button');
    fromHere.innerHTML = 'Åk härifrån';
    toHere.setAttribute('type', 'button');
    toHere.innerHTML = 'Åk hit';

    L.DomEvent.addListener(fromHere, 'click', function() {
        routingControl.spliceWaypoints(0, 1, e.latlng);
        map.closePopup();
    });
    L.DomEvent.addListener(toHere, 'click', function() {
        routingControl.spliceWaypoints(routingControl.getWaypoints().length - 1, 1, e.latlng);
        map.closePopup();
    });

    map.openPopup(content, e.latlng);
});

map.on('locationerror', function() {
    map.fitBounds(L.latLngBounds([55.3,9.6],[69.3,26.6]));
});

map.locate({
    setView: true,
    timeout: 1000
});