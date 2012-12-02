var width = 800, height = 400, stream_length = 1024;

var svg = d3.select('#music').append('svg')
    .attr('width', width)
    .attr('height', height);

var ctx = new webkitAudioContext(),
    node = ctx.createJavaScriptNode(stream_length, 1, 2),
    volume = ctx.createGainNode();
volume.gain.value = 0.01;
node.connect(volume);
volume.connect(ctx.destination);

// a triangle wave
var tri = (function(sample_rate) {
    var phase = 0,
        phaseStep = 110 / sample_rate;
    return function(p) {
        var w = 2 / p;
        if (phase > w) phase -= w;
        var r = phase * p;
        var ret = 2 * ((r >= 1 ? 2 - r : r) - 0.5);
        phase += phaseStep;
        return ret;
    };
})(ctx.sampleRate);

// fill a sample with triangle waves
function next(hz) {
    var stream = [], i;
    for (i = 0; i < stream_length; i++) stream[i] = tri(hz);
    return stream;
}

var on = false, note = 5;

function add(waves, i) {
    return waves.map(function(w) {
        return w[i];
    }).reduce(function(mem, w) {
        return mem + w;
    }) / waves.length;
}

node.onaudioprocess = function(event) {
    var i,
        l = event.outputBuffer.getChannelData(0),
        r = event.outputBuffer.getChannelData(1);
    if (on) {
        var waves = freq.map(next), nwaves = waves.length;
        for (i = 0; i < l.length; i++) {
            l[i] = r[i] = add(waves, i);
        }
    } else {
        for (i = 0; i < l.length; i++) {
            l[i] = r[i] = 0;
        }
    }
};

d3.select('#on').on('change', function() {
    on = this.checked;
});

function makeBoard() {
    return d3.range(0, 50).reduce(function(mem, time) {
        return mem.concat(d3.range(0, 25).map(function(note) {
            return {
                time: time,
                note: note,
                on: false
            };
        }));
    }, []);
}

var board = makeBoard();

var scale_note = d3.scale.linear()
        .domain([0, 24])
        .range([height, 0]),
    scale_time = d3.scale.linear()
        .domain([0, 49])
        .range([0, width]);

var notes = svg.selectAll('g.note')
    .data(board)
    .enter()
    .append('g')
    .attr('class', 'note')
    .attr('transform', function(d) {
        return 'translate(' +
            scale_time(d.time) + ',' +
            scale_note(d.note) + ')';
    });

function drawbars(data) {
    var bars = svg.selectAll('g.bar')
        .data(data);
    bars.enter()
        .append('g').attr('class', 'bar')
        .attr('fill', '#e0518a')
        .append('rect')
        .attr('width', 1)
        .attr('height', height - 2);
    bars
        .transition()
        .attr('transform', function(d) {
        return 'translate(' + (scale_time(d) - 1) + ',0)';
    });
    bars.exit().remove();
}

notes.append('rect')
    .attr({ width: 15, height: 15 });

notes.on('click', function(d) {
    d.on = !d.on;
    d3.select(this).select('rect').classed('on', d.on);
    hashset();
}).on('mouseover', function(d) {
    if (!d3.event.which) return;
    d.on = !d.on;
    d3.select(this).select('rect').classed('on', d.on);
    hashset();
});

function setbar(_) {
    drawbars(d3.range(0, 50, _));
}

d3.select('#bar')
    .on('change', function() {
        setbar(this.value);
    })
    .selectAll('option')
    .data(d3.range(2, 9))
    .enter()
        .append('option')
        .text(String)
        .attr('value', String);

d3.select('#reset').on('click', function() {
    board = makeBoard();
    notes.select('rect').classed('on', false);
    hashset();
});

setbar(4);

function encode() {
    return board.map(function(d) {
        return d.on ? String.fromCharCode(97 + d.note) : '_';
    }).join('');
}

var hashseti;
function hashset() {
    if (hashseti !== null) window.clearTimeout(hashseti);
    hashseti = window.setTimeout(function() {
        window.location.hash = encode();
        hashseti = null;
    }, 500);
}

function updateBpm() {
    bpm = +d3.select('#bpm').node().value;
}

updateBpm();

d3.select('#bpm').on('keyup', updateBpm);
d3.select('#bpm-up').on('click', function() {
    var bi = d3.select('#bpm').node();
    bi.value = +bi.value + 10;
    updateBpm();
});
d3.select('#bpm-down').on('click', function() {
    var bi = d3.select('#bpm').node();
    bi.value = (+bi.value) - 10;
    updateBpm();
});

var playing = true;
d3.select('#play-pause').on('click', function() {
    playing = !playing;
    d3.select(this).select('i')
        .attr('class', function() {
            return playing ? 'icon-pause' : 'icon-play';
        });
    if (playing) step();
});

// iterate through notes
var pos = 0;
function step() {
    var note = board.filter(function(d) {
        return d.time == pos && d.on;
    });
    notes.classed('playing', function(d) {
        return d.time == pos;
    });
    if (!note.length) on = false;
    else {
        on = true;
        freq = note.map(function(n) { return n.note; });
    }
    if (pos++ > 50) pos = 0;
    if (playing) window.setTimeout(step, (60 * 1000) / bpm);
}
step();


