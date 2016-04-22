var reqwest = require('reqwest');

module.exports = function(type, osmId, cb) {
    reqwest({
        url: 'https://www.openstreetmap.org/api/0.6/' + type + '/' + osmId,
        crossOrigin: true,
        type: 'xml'
    }).then(function(data) {
        var tagTags = data.getElementsByTagName('tag'),
            tags = {},
            i,
            t;

        for (i = 0; i < tagTags.length; i++) {
            t = tagTags[i];
            tags[t.getAttribute('k')] = t.getAttribute('v');
        }

        cb(null, tags);
    }, function(err) {
        cb(err);
    });
};
