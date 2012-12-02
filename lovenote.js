var width = 500, height = 200, stream_length = 1024;

var svg = d3.select(document.body).append('svg')
    .attr('width', width)
    .attr('height', height);

var ctx = new webkitAudioContext();
var node = ctx.createJavaScriptNode(stream_length, 1, 2);
var volume = ctx.createGainNode();
volume.gain.value = 0.01;
node.connect(volume);
volume.connect(ctx.destination);

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

function next(hz) {
    var stream = [], i;
    for (i = 0; i < stream_length; i++) stream[i] = tri(hz);
    return stream;
}

var on = false, note = 5;

node.onaudioprocess = function(event) {
    var i,
        l = event.outputBuffer.getChannelData(0),
        r = event.outputBuffer.getChannelData(1);
    if (on) {
        var wave = next(freq);
        for (i = 0; i < l.length; i++) {
            l[i] = r[i] = wave[i];
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

var board = d3.range(0, 50).reduce(function(mem, time) {
    return mem.concat(d3.range(0, 20).map(function(note) {
        return {
            time: time,
            note: note,
            on: false
        };
    }));
}, []);

var scale_note = d3.scale.linear().domain([0, 20]).range([height, 0]);
var scale_time = d3.scale.linear().domain([0, 50]).range([0, width]);

var notes = svg.selectAll('g.note')
    .data(board)
    .enter()
    .append('g')
    .attr('class', function(d, i) {
        return 'note';
    })
    .attr('transform', function(d) {
        return 'translate(' +
            scale_time(d.time) + ',' +
            scale_note(d.note) + ')';
    });

notes.append('rect')
    .attr({ width: 9, height: 9 });

notes.on('click', function(d) {
    d.on = !d.on;
    d3.select(this).select('rect').classed('on', d.on);
});

function setbar(_) {
    notes.attr('class', function(d, i) {
        return 'note ' + (d.time % _ === 0 ? 'isbar' : '');
    });
}

d3.select('#bar')
    .on('change', function() {
        setbar(this.value);
    })
    .selectAll('option')
    .data(d3.range(2, 9))
    .enter().append('option')
    .text(String)
    .attr('value', String);

setbar(4);

var pos = 0;
window.setInterval(function() {
    var note = board.filter(function(d) {
        return d.time == pos && d.on;
    });
    notes.classed('playing', function(d) {
        return d.time == pos;
    });
    if (!note.length) on = false;
    else {
        on = true;
        freq = note[0].note;
    }
    if (pos++ > 50) pos = 0;
}, 200);


