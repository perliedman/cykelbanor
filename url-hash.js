module.exports = {
    parse: function(hash) {
        var components;

        if (hash[0] === '#') {
            hash = hash.substring(1);
        }

        components = hash.split('&');

        return components.reduce(function(state, c) {
            var i = c.indexOf('='),
                key = i > 0 ? c.substring(0, i) : c,
                value = i > 0 ? decodeURIComponent(c.substring(i + 1)) : undefined;

            if (key && key !== '=') {
                state[key] = value;
            }
            return state;
        }, {});
    },

    encode: function(state) {
        return Object.keys(state).reduce(function(components, key) {
            components.push(key + '=' + encodeURIComponent(state[key]));
            return components;
        }, []).join('&');
    }
};
