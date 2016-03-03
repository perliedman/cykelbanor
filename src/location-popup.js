var L = require('leaflet'),
    address = require('./address'),
    addressPopup = require('../templates/address-popup.hbs');

require('leaflet-underneath');

var showFeatureDetails = function(f, map) {
    var coord = f.geometry.coordinates,
        ll = [coord[1], coord[0]],
        marker = L.circleMarker(ll, {radius: 5})
        .addTo(map)
        .bindPopup('<h4><i class="maki maki-lg maki-' + f.properties.maki + '"></i>&nbsp;' + f.properties.name + '</h4>')
        .openPopup();

    map.once('popupclose', function() {
        map.removeLayer(marker);
    });
};

module.exports = function(routingControl, poiLayer, latlng) {
    var $content = $(addressPopup()),
        popup = L.popup().
            setLatLng(latlng).
            setContent($content[0]),
        closePopup = function() {
            // TODO: do this in a nicer way
            if (popup._map) {
                popup._map.closePopup(popup);
            }
        },
        name;

    L.Control.Geocoder.nominatim().reverse(latlng, 256 * Math.pow(2, 18), function(r) {
        if (r && r[0]) {
            name = address(r[0]);
            $content.find('[data-address]').html(name.html);
        }
    });

    poiLayer.query(latlng, function(err, results) {
        if (err) {
            return console.error(err);
        }

        var $nearby = $content.find('[data-nearby]');
        results.slice(0, 5).forEach(function(r) {
            var $element = $('<a href="javascript: void();" class="item">' +
                '<i class="maki maki-fw maki-' + r.properties.maki + ' icon"></i>' +
                '<div class="content">' + r.properties.name + '</div></a>');
            $element.click(function() {
                showFeatureDetails(r, popup._map);
            });

            $nearby.append($element);
        });
    }, undefined, 200);

    $content.find('[data-from]').click(function() {
        routingControl.spliceWaypoints(0, 1, {
            latLng: latlng,
            name: name && name.text ? name.text : ''
        });
        closePopup();
    });
    $content.find('[data-to]').click(function() {
        routingControl.spliceWaypoints(routingControl.getWaypoints().length - 1, 1, {
            latLng: latlng,
            name: name && name.text ? name.text : ''
        });
        closePopup();
    });

    return popup;
};
