var htmlTemplate = require('../templates/address-template-html.hbs'),
    textTemplate = require('../templates/address-template-text.hbs');

module.exports = function address (r) {
    return {
        html: htmlTemplate(r.properties.address).trim(),
        text: textTemplate(r.properties.address).trim()
    };
};
