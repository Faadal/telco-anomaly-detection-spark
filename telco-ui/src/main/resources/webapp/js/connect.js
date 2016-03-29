var source = new EventSource('/talk');

source.addEventListener('init', function(e) {
    console.log('init');
    console.log(JSON.parse(e.data));
    onInit(JSON.parse(e.data));
}, false);

source.addEventListener('move', function(e) {
    console.log('move');
    console.log(JSON.parse(e.data));
    onMove(JSON.parse(e.data));
}, false);

source.addEventListener('status', function(e) {
    console.log('status');
    console.log(JSON.parse(e.data));
    onStatus(JSON.parse(e.data));
}, false);


var FIELD = {
    input: {
        x: 20000,
        y: 20000
   },
    output: {
        x: 900,
        y: 900
    }
};

var callers = new Map();
var towers = new Map();

d3.select("#universe").attr("width", FIELD.output.x)
                       .attr("height", FIELD.output.y);

var svgContainer = d3.select("#universe").append("svg")
                                        .attr("width", FIELD.output.x)
                                        .attr("height", FIELD.output.y)
                                        .style("border", "1px solid black");

function onMove(data) {
    data.x = FIELD.output.x*data.x/FIELD.input.x;
    data.y = FIELD.output.y*data.y/FIELD.input.y;
    if (callers.has(data.callerId)) {
        callers.set(data.callerId, data);
    } else {
        callers.set(data.callerId, data);
    }
}

function onStatus(data) {
    var ramp=d3.scale.linear().domain([0,1]).range(["green", "red"]);
    d3.select("#tower"+data.towerId)
        .attr("fill",  ramp(data.fails/data.total));
}

function addCallers() {
    svgContainer.selectAll("circle").remove();
    var circles = svgContainer.selectAll("circle")
                          .data(Array.from(callers.values()))
                          .enter()
                          .append("circle");

    circles.attr("cx", function (d) {return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("r", 4)
        .attr("id", function (d) { return d.callerId; })
        .style("fill", "blue")
        .style("stroke", "black");
}

setInterval(addCallers, 1000);

function onInit(data) {
    var display = [];
    data.x0 /= FIELD.input.x;
    data.y0 /= FIELD.input.y;
    towers.set(data.towerId, data);
    for (var theta = 0; theta < 2 * Math.PI; theta += 0.01) {
        var x = Math.cos(theta) + data.x0;
        var y = Math.sin(theta) + data.y0;
        var local_power = Math.pow(10, power(data, x, y) / 20);
        display.push({"x": (data.x0 + local_power * (x - data.x0))*FIELD.output.x,
                       "y": (data.y0 + local_power * (y - data.y0))*FIELD.output.y});
    }

    var lineFunction = d3.svg.line()
                              .x(function(d) { return d.x; })
                              .y(function(d) { return d.y; })
                             .interpolate("basis-closed");

    var lineGraph = svgContainer.append("path")
                                .attr("id", "tower" + data.towerId)
                                .attr("d", lineFunction(display))
                               .attr("stroke", "#006600")
                               .attr("stroke-width", 2)
                               .style("opacity", 0.5)
                                .attr("fill", "green");
}


function power(data, x, y) {
    var rSquared = (x - data.x0) * (x - data.x0) + (y - data.y0) * (y - data.y0);
    if (rSquared <= data.r0Squared) {
        return dbm(data.p0);
    } else {
        var theta = Math.atan2(y - data.y0, x - data.x0) - data.theta0;
        return dbm(antennaGain(data, theta) * data.r0Squared / rSquared * data.p0);
    }
}

function antennaGain(data, theta) {
    var directivity = data.scale * (1 - data.eccentricity * data.eccentricity) / (1 - data.eccentricity * Math.cos(theta));
    var cardiod = Math.abs(Math.cos(data.lobes * theta));
    return cardiod * directivity;
}

function dbm(power) {
    return 20 * Math.log10(power / 1e-3);
}