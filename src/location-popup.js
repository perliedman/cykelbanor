var L = require('leaflet'),
    address = require('./address'),
    addressPopup = require('../templates/address-popup.hbs');

require('leaflet-underneath');

module.exports = function(routingControl, poiLayer, e) {
    var $content = $(addressPopup()),
        popup = L.popup().
            setLatLng(e.latlng).
            setContent($content[0]),
        closePopup = function() {
            // TODO: do this in a nicer way
            if (popup._map) {
                popup._map.closePopup(popup);
            }
        },
        name;

    L.Control.Geocoder.nominatim().reverse(e.latlng, 256 * Math.pow(2, 18), function(r) {
        if (r && r[0]) {
            name = address(r[0]);
            $content.find('[data-address]').html(name.html);
        }
    });

    poiLayer.query(e.latlng, function(err, results) {
        if (err) {
            return console.error(err);
        }

        var $nearby = $content.find('[data-nearby]');
        results.slice(0, 5).forEach(function(r) {
            $nearby.append($('<div class="item">' +
                '<i class="maki-icon ' + r.properties.maki + ' icon"></i>' +
                '<div class="content">' + r.properties.name + '</div></div>'));
        });
    }, undefined, 200);

    $content.find('[data-from]').click(function() {
        routingControl.spliceWaypoints(0, 1, {
            latLng: e.latlng,
            name: name && name.text ? name.text : ''
        });
        closePopup();
    });
    $content.find('[data-to]').click(function() {
        routingControl.spliceWaypoints(routingControl.getWaypoints().length - 1, 1, {
            latLng: e.latlng,
            name: name && name.text ? name.text : ''
        });
        closePopup();
    });

    return popup;
};
