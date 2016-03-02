//////////////// TABS ////////////////

$(function() {
    $( "#tabs" ).tabs();
});

//////////////// TAB #1: SUMMARY ////////////////

// Create Legend

var h3 = 120,
    w3 = 250,
    legendRectSize = 18,
    legendSpacing = 4,
    spacePadding = 8,
    horizontalPadding = 40;

svg3 = d3.select("#legend-box").append("svg")
    .attr("height", h3)
    .attr("width", w3);

legendColors = [{legendColor: '#023858', value: "95-99th"},
    {legendColor: '#2b8cbe', value: "85-94th"},
    {legendColor: '#74a9cf', value: "70-84th"},
    {legendColor:  '#bdc9e1', value: "50-69th"},
    {legendColor: '#f1eef6', value: "< 50th"}]

var legend = svg3.selectAll('.legend')
    .data(legendColors)
    .enter()
    .append("g")
    .attr("class", legend);

legend.append("rect")
    .attr("width", legendRectSize)
    .attr("height", legendRectSize)
    .attr("y", function(d,i){
        return i * (legendRectSize + spacePadding)
    })
    .attr("x", 3 * horizontalPadding)
    .style("stroke", function(d) {return d.legendColor})
    .style("fill", function(d) {return d.legendColor})


legend.append("text")
    .attr("x", legendRectSize + legendSpacing + horizontalPadding)
    .attr("y", function(d,i){
        return i * (legendRectSize + spacePadding) + 0.75 * legendRectSize
    })
    .text(function(d) {return d.value});


//////////////// TAB #2: BREAKDOWN ////////////////

// Create table

function createTable (data) {
    var table = d3.select('#tabs-1')
        .append('table');

    // Create table header
    var columns = [{ head: "Parking Violation", html: ƒ('Violation')},
        { head: "No. of Tickets", html: ƒ('Total')}]

    table.append('thead').append('tr')
        .selectAll('th')
        .data(columns).enter()
        .append('th')
        .text(ƒ('head'));

    // Create table body

    table.append('tbody')
        .selectAll('tr')
        .data(data).enter()
        .append('tr')
        .selectAll('td')
        .data(function (row, i) {
            return columns.map(function (c) {
                // compute cell values for this specific row
                var cell = {};
                d3.keys(c).forEach(function (k) {
                    cell[k] = typeof c[k] == 'function' ? c[k](row, i) : c[k];
                });
                return cell;
            });
        }).enter()
        .append('td')
        .html(ƒ('html'))
}

// Load summary data and call createTable

d3.csv("data/violation_count.csv", function(dataset) {
    dataset.forEach(function(d) {return d.Total = +d.Total});
    createTable(dataset)
});


//////////////// MAP ////////////////

// Initialize Leaflet Map

var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

var map = new L.Map("map", {center: [42.377, -71.1100], zoom: 13})
    .addLayer(CartoDB_Positron);

// Global Zoomlevel for Map

var zoomLevel = 13;

var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

// Colors for map -- from Colorbrewer
/*colors = ['#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6', '#f1eef6',
            '#bdc9e1', '#bdc9e1', '#bdc9e1', '#bdc9e1',
            '#74a9cf', '#74a9cf', '#74a9cf',
            '#2b8cbe','#2b8cbe',
            '#023858'];*/

var classAssignments = ["group1","group1","group1","group1","group1","group1","group1","group1","group1","group1",
                "group2","group2","group2","group2",
                "group3","group3","group3",
                "group4", "group4",
                "group5"];

function createMap(data) {

    var transform = d3.geo.transform({point: projectPoint}),
        path = d3.geo.path().projection(transform);

    // Create class scale (formerly color scale)
    var allStreets = data.features.map(function(d) {return d.properties.TOTAL});

    var classScale = d3.scale.quantile()
        .domain(allStreets)
        .range(classAssignments);

    // Create paths

    var feature = g.selectAll("path")
        .data(data.features);

    var clickedFunction = function(d) {
        console.log(d);
        d3.selectAll(".highlightedLine").classed("highlightedLine",false);
        d3.select(this).classed("highlightedLine",true);

        var timeData = [];
        var objectKeys = Object.keys(d.properties);
        for (var i = 3; i < 19; i++) {
            timeData.push(d.properties[objectKeys[i]])
         }
        console.log(timeData);
        updateTimeBars(timeData);
        updateInfoBox(d.properties)
    };

    var mouseoverFunction = function(d) {
        d3.select(this).classed("highlightedLine2", true)
    };

    var mouseoutFunction = function(d) {
        d3.select(this).classed("highlightedLine2",false)
    };

    // Enter and style paths
    feature.enter().append("path")
        .attr("class", function(d) {
            return classScale(d.properties['TOTAL'])
        })
        .on("click", clickedFunction)
        .on("mouseover", mouseoverFunction)
        .on("mouseout", mouseoutFunction);

    // Get Zoom Level
    map.on('zoomend', onZoomend);
    function onZoomend() {
        zoomLevel = map.getZoom();
        feature.style('stroke-width', function(d){return setStrokeWidth(zoomLevel)});
        console.log(zoomLevel)
    };

    // Update stroke width based on zoom
    var setStrokeWidth = function(input) {
        if (input < 13) {
            return 1.5
        } else if (input == 14) {
            return 4
        } else if (input == 15) {
            return 6
        } else if (input >= 16) {return 8}
    };

    map.on("viewreset", reset);
    reset();

    // Reposition the SVG to cover the features.
    function reset() {
        var bounds = path.bounds(data),
            topLeft = bounds[0],
            bottomRight = bounds[1];

        svg .attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

        g   .attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        feature.attr("d", path);
    }

    // Use Leaflet to implement a D3 geometric transformation.
    function projectPoint(x, y) {
        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }
}

d3.json("data/CambridgeStreets11_Zeroes.geojson", function(error, dataset) {
    if (error) throw error;
    //filteredData = dataset.filter(function(d){return d.features.properties.Sum_Count != 0})
    console.log(dataset);
    dataset.features.sort(function(a,b) {
        return a.properties.TOTAL - b.properties.TOTAL
    });
    createMap(dataset)
});



/////// NEW TIME BARS ///////

var hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
var timeOriginal = [165, 21837, 41925, 36778, 41103, 32516, 46231, 54421, 41268, 40673, 39601, 24213, 32703, 9011, 4315, 1085]

createBars(timeOriginal);

function createBars (data) {

    // Constants
    var h2 = 150,
        w2 = 700,
        margin2 = {top: 10, bottom: 30, left: 75, right: 10},
        barWidth2 = 22;

    // SVG2 - Time Bars SVG
    var svg2 = d3.select("#time-bars").append("svg")
        .attr("height", h2 + margin2.bottom + margin2.top)
        .attr("width", w2)
        .attr("id", "bar-chart");

    // X scales and axis
    var xScale2 = d3.scale.linear()
        .domain([d3.min(hours), d3.max(hours)])
        .rangeRound([margin2.left, w2 - margin2.left - margin2.right]);

    var yScale2 = d3.scale.linear()
        .domain([0, d3.max(data)])
        .range([h2, margin2.top]);

    // Data Bind
    var bars = svg2.selectAll("rect")
        .data(data);

    // Enter Data
    bars.enter()
        .append("rect")
        .attr("class", "bars")
        .attr("x", function (d, i) {
            return xScale2(i + 7)
        })
        .attr("width", barWidth2)
        .attr('y', function (d) {
            return yScale2(d)
        })
        .attr('height', function (d) {
            return h2 - yScale2(d)
        });

    var xAxis = d3.svg.axis()
        .scale(xScale2)
        .ticks(12);

    svg2.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (0.5 * barWidth2) + "," + h2 + ")")
        .call(xAxis);

    var yAxis = d3.svg.axis()
        .scale(yScale2)
        .ticks(5)
        .orient("left");

    svg2.append("g")
        .attr("class", "yaxis")
        .attr("transform", "translate(75,0)")
        .call(yAxis);

    updateTimeBars = function(data) {
        console.log(data);

        // Define transition

        var t = svg2.transition().duration(500);

        // Update yScale

        yScale2.domain([0,d3.max(data)]);

        bars.data(data);
        t.selectAll(".bars")
            .attr('y', function (d) {
                return yScale2(d)
            })
            .attr('height', function (d) {
                return h2 - yScale2(d)
            });

        // Transition y-axis
        t.select(".yaxis").call(yAxis);
    };

    updateTimeBars(timeOriginal);
}

///////// INFO BOX /////////

function updateInfoBox (data) {
    var formatter = d3.format(",");
    console.log(data);
    d3.select("#street-name").html(data.STREET);
    d3.select("#ticket-total").html(formatter(data.TOTAL))
}

initialData = {STREET: "All Streets", TOTAL: 470743};

updateInfoBox(initialData);

$(function() {
    $( "#button-reset" )
        .button()
        .click(function( event ) {

            updateTimeBars(timeOriginal);
            d3.selectAll(".highlightedLine").classed("highlightedLine",false)
        });
});


