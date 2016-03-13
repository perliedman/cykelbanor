var restaurantCuisineI18N = {
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
    };

module.exports = {
    'amenity': [{
        'restaurant': function(f) {
            var cuisine = restaurantCuisineI18N[f.cuisine];
            return cuisine ? cuisine : 'Restaurang' + (f.cuisine ? ' (' + f.cuisine + ')' : '');
        },
        'fast_food': function(f) {
            var cuisine = fastfoodCuisineI18N[f.cuisine];
            return cuisine ? cuisine : 'Snabbmat' + (f.cuisine ? ' (' + f.cuisine + ')' : '');
        },
        'cafe': 'Kafé',
        'veterinary': 'Veterinär',
        'fuel': 'Bensinmack',
        'bicycle_rental': 'Hyrcyklar',
        'clinic': 'Vårdcentral',
        'hospital': 'Sjukhus',
        'dentist': 'Tandläkare',
        'pub': 'Pub'
    }],
    'shop': [{
        'hardware': 'Järnaffär',
        'bathroom_furnishing': 'Badrumsinredning',
        'outdoor': 'Vildmarksaffär',
        'car_repair': 'Bilverkstad',
        'clothes': 'Klädaffär',
        'hairdresser': 'Frisör',
        'shoes': 'Skoaffär',
        'confectionery': 'Godisaffär'
    }, 'affär'],
    'office': [{}, 'kontor']
};
