var template = require('../templates/osm-feature-details.hbs'),
    Handlebars = require('hbsfy/runtime'),
    restaurantCuisineI18N = {
        'indian': 'Indisk restaurang',
        'pizza': 'Pizza-restaurang',
        'burger': 'Hamburgerrestaurang',
        'greek': 'Grekisk restaurang',
        'turkish': 'Turkisk restaurang',
        'chinese': 'Kinarestaurang',
        'vietnamese': 'Vietnamesisk restaurang',
        'thai': 'Thailändsk restaurang',
        'asian': 'Asiatisk restaurang',
        'sushi': 'Sushi-restaurang'
    },
    fastfoodCuisineI18N = {
        'pizza': 'Pizzeria',
        'burger': 'Hamburgare',
        'thai': 'Thai-mat'
    },
    amenityI18N = {
        'restaurant': function(f) {
            var cuisine = restaurantCuisineI18N[f.cuisine];
            return cuisine ? cuisine : 'Restaurang' + (f.cuisine ? ' (' + f.cuisine + ')' : '');
        },
        'fast_food': function(f) {
            var cuisine = fastfoodCuisineI18N[f.cuisine];
            return cuisine ? cuisine : 'Snabbmat' + (f.cuisine ? ' (' + f.cuisine + ')' : '');
        },
        'cafe': function() { return 'Kafé'; },
        'veterinary': function() { return 'Veterinär'; },
        'fuel': function() { return 'Bensinmack'; },
        'bicycle_rental': function() { return 'Hyrcyklar'; }
    },
    shopI18N = {
        'hardware': function() { return 'Järnaffär'; },
        'bathroom_furnishing': function() { return 'Badrumsinredning'; },
        'outdoor': function() { return 'Vildmarksaffär'; },
        'car_repair': function() { return 'Bilverkstad'; },
        'clothes': function() { return 'Klädaffär'; },
        'hairdresser': function() { return 'Frisör'; },
        'shoes': function() { return 'Skoaffär'; },
        'confectionery': function() { return 'Godisaffär'; }
    },
    initialUpperCase = function(s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    },
    moment,
    openingHours;

$.getScript = function(src, func) {
    var script = document.createElement('script');
    script.async = 'async';
    script.src = src;
    if (func) {
        script.onload = func;
    }
    document.getElementsByTagName('head')[0].appendChild( script );
};

Handlebars.registerHelper('osmFeatureDescription', function(f) {
    var result = '';

    if (f.amenity) {
        var amenityFn = amenityI18N[f.amenity];
        result = (amenityFn ? amenityFn(f) : null) || f.amenity;
    } else if (f.shop) {
        var shopFn = shopI18N[f.shop];
        result = (shopFn ? shopFn(f) : null) || f.shop;
    }

    return initialUpperCase(result.replace('_', ' '));
});

Handlebars.registerHelper('osmOpeningHours', function(f) {
    if (!f.opening_hours) return '';

    var oh = new openingHours(f.opening_hours),
        from = new Date(),
        to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000),
        intervals = oh.getOpenIntervals(from, to),
        rows = [],
        i;

    for (i in intervals) {
        var start = moment(intervals[i][0]),
            end = moment(intervals[i][1]);
        rows.push('<li><em>' + start.calendar(null, {
            sameDay: '[idag]',
            nextDay: '[imorgon]',
            nextWeek: 'dddd',
            sameElse: 'DD/MM/YYYY'
        }) + '</em>:&nbsp;' + (intervals[i][3] ? '("' + intervals[i][3] + '") ' : '') +
            start.format('HH:mm') + '&nbsp;-&nbsp;' + end.format('HH:mm'));
    }

    return new Handlebars.SafeString('<h5>Öppettider:</h5><ul>' + rows.join('\n') + '</ul>');
});

module.exports = function(osmFeature, cb) {
    if (!openingHours || !moment) {
        $.getScript('module-osm-feature-details.js', function() {
            openingHours = require('opening_hours');
            moment = require('moment');

            require('moment/locale/sv');
            moment.locale('sv');

            cb($(template(osmFeature)));
        });
    } else {
        cb($(template(osmFeature)));
    }
};
