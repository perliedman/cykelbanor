var L = require('leaflet'),
    address = require('./address'),
    getOsmObject = require('./osm-object'),
    getFeatureDetails = require('./feature-details'),
    featureDetails = require('../templates/feature-details.hbs'),
    addressPopup = require('../templates/address-popup.hbs');

require('leaflet-underneath');

var showFeatureDetails = function(f, map) {
    var coord = f.geometry.coordinates,
        ll = [coord[1], coord[0]],
        $content = $(featureDetails(f)),
        marker = L.circleMarker(ll, {radius: 5})
            .addTo(map)
            .bindPopup($content[0])
            .openPopup();

    getOsmObject('node', f.id - 1000000000000000, function(err, osmFeature) {
        if (err) {
            return console.warn(err);
        }

        getFeatureDetails(osmFeature, function($details) {
            if ($details) {
                var $detailsContainer = $content.find('[data-details]');
                $detailsContainer.removeClass('hide');
                $detailsContainer.append($details);
            }

            if (osmFeature.website) {
                var $website = $content.find('[data-website]');
                $website.attr('href', osmFeature.website);
                $website.text(osmFeature.website);
                $website.removeClass('hide');
            }
        });
    });

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

        if (results.length === 0) return;

        $content.find('[data-nearby-container]').removeClass('hide');

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
    }, undefined, 50);

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
