var templates = [
    {
        filter: function(f) { return f.amenity === 'restaurant'; },
        template: require('../templates/features/restaurant.hbs')
    }
];

module.exports = function(osmFeature) {
    var template,
        i;

    for (i = 0; !template && i < templates.length; i++) {
        if (templates[i].filter(osmFeature)) {
            template = templates[i].template;
        }
    }

    return $(template(osmFeature));
};
