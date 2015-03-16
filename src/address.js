var Handlebars = require('handlebars'),
    htmlTemplate = Handlebars.compile('{{building}} {{road}} {{house_number}} <small>{{postcode}} {{city}}</small>'),
    textTemplate = Handlebars.compile('{{building}} {{road}} {{house_number}}, {{postcode}} {{city}}');

module.exports = function address (r) {
    return {
        html: htmlTemplate(r.properties.address).trim(),
        text: textTemplate(r.properties.address).trim()
    };
};
