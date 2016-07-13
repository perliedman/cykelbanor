var L = require('leaflet'),
    d3 = require('d3');

module.exports = L.Class.extend({
    onAdd: function() {
        this._container = L.DomUtil.create('div', 'elevation-control');
        return this._container;
    },

    addData: function(geojson) {
        var margin = {top: 4, right: 10, bottom: 20, left: 24},
            width = 320 - margin.left - margin.right,
            height = 80 - margin.top - margin.bottom;

        var x = d3.scaleLinear().range([0, width]);
        var y = d3.scaleLinear().range([height, 0]);
         
        // Define the axes
        var xAxis = d3.axisBottom(x).ticks(5);
        var yAxis = d3.axisLeft(y).ticks(5);

        var valueline = d3.line()
            .x(function(d) { return x(d.distance); })
            .y(function(d) { return y(d.elevation); });

        var svg = d3.select(this._container)
            .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
            .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var data = geojson.coordinates.reduce(function(a, c) {
            var ll = L.latLng([c[1], c[0], c[2]]),
                elevDiff,
                dist;

            if (a.lastLatLng) {
                dist = a.lastLatLng.distanceTo(ll);
                a.accDist += dist;
                elevDiff = ll.alt - a.lastLatLng.alt;
                if (elevDiff > 0) {
                    a.accClimb += elevDiff;
                } else {
                    a.accDesc -= elevDiff;
                }
            }

            a.data.push({
                distance: a.accDist/1000,
                elevation: c[2]
            });
            a.lastLatLng = ll;
            return a;
        }, {
            accDist: 0,
            accClimb: 0,
            accDesc: 0,
            data: []
        });

        var statsElem = L.DomUtil.create('div', 'stats', this._container),
            gramCO2 = data.accDist * 190.280 / 1000;
        statsElem.innerHTML =
            L.Util.template('&#9650;{climb} m, &#9660;{desc} m, sparar {co2} {co2unit} CO<sub>2</sub>', {
                climb: Math.round(data.accClimb),
                desc: Math.round(data.accDesc),
                co2: gramCO2 < 1000 ? Math.round(gramCO2) : Math.round(gramCO2 / 100) / 10,
                co2unit: gramCO2 < 1000 ? 'g' : 'kg'
            });

        // Scale the range of the data
        x.domain([0, d3.max(data.data, function(d) { return d.distance; })]);
        y.domain([0, Math.ceil(d3.max(data.data, function(d) { return d.elevation; }) / 50) * 50]);
     
        // Add the valueline path.
        svg.append('path')
            .attr('class', 'line')
            .attr('d', valueline(data.data));
     
        // Add the X Axis
        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);
     
        // Add the Y Axis
        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);


    },

    clear: function() {
        if (this._container) {
            this._container.innerHTML = '';
        }
    }
});
