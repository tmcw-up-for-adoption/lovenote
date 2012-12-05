var width = 800,
    height = 500,
    on = false,
    note = 5,
    lowest = 19,
    tones = 15,
    highest = lowest + tones;

var svg = d3.select('#music')
    .append('svg')
    .attr({ width: width, height: height });

d3.select('#on').on('change', function() {
    on = this.checked;
});

function makeBoard() {
    return d3.range(0, 50).reduce(function(mem, time) {
        return mem.concat(d3.range(lowest, highest).map(function(note) {
            return {
                time: time,
                note: note,
                on: false
            };
        }));
    }, []);
}

function drawbars(data) {
    var bars = blockg.selectAll('g.bar')
        .data(data);
    bars.enter()
        .append('g').attr('class', 'bar')
        .attr('fill', '#e0518a')
        .append('rect')
        .attr('width', 1)
        .attr('height', tones * 16);
    bars
        .transition()
        .attr('transform', function(d) {
        return 'translate(' + (scale_time(d) - 1) + ',0)';
    });
    bars.exit().remove();
}

function setbar(_) {
    drawbars(d3.range(0, 50, _));
}

function updateBpm() {
    bpm = +d3.select('#bpm').node().value;
}

var board = makeBoard();

var scale_note = d3.scale.linear()
        .domain([lowest, highest - 1])
        .range([tones * 15, 0]),
    scale_time = d3.scale.linear()
        .domain([0, 50])
        .range([0, width])
        .clamp(true);

var note_names = 'C C# D D# E F F# G G# A A# B'.split(' ');

var blockg = svg.append('g')
    .attr('transform', 'translate(0, 16)');

svg.append('rect')
    .attr('class', 'sep')
    .attr('transform', 'translate(0, 15)')
    .attr({ width: width, height: 1 });
var blocks = blockg.selectAll('g.note')
    .data(board)
    .enter()
    .append('g')
    .attr('class', 'note')
    .attr('transform', function(d) {
        return 'translate(' +
            scale_time(d.time) + ',' +
            scale_note(d.note) + ')';
    });

blocks.append('rect')
    .attr({ width: 15, height: 15 });

blocks.append('text')
    .attr('dy', 12)
    .attr('dx', 2)
    .text(function(d) {
        return note_names[(d.note - 19) % 12];
    });

blocks.on('click', function(d) {
    board.map(function(b) {
        if (b.time === d.time) b.on = false;
    });
    d.on = !d.on;
    blocks.select('rect').classed('on', function(d) { return d.on; });
}).on('mouseover', function(d) {
    if (!d3.event.which) return;
    var on = !d.on;
    board.map(function(b) {
        if (b.time === d.time) b.on = false;
    });
    d.on = on;
    blocks.select('rect').classed('on', function(d) { return d.on; });
});

var timeline = svg.selectAll('g.timeline')
    .data(d3.range.apply(null, scale_time.domain()))
    .enter()
    .append('g')
    .attr('class', 'timeline')
    .attr('transform', function(d) {
        return 'translate(' +
            scale_time(d) + ',0)';
    });

timeline.append('rect')
    .attr({ width: 15, height: 15 });

function cuePos() {
    return 'translate(' + scale_time(d3.select(this).data()) + ', 0)';
}

function dragCue(d) {
    d3.select(this).data([Math.round(scale_time.invert(d3.event.x))]);
    d3.select(this)
       .attr('transform', cuePos);
}

function saveCue(d) { loop = cue.data(); }
function cueOrigin(d) { return { x: scale_time(d), y: 0 }; }

var s = scale_time.domain().slice();
var loop = [s[0], s[1] - 1];

var cue = svg.selectAll('g.cue')
    .data(loop)
    .enter()
    .append('g')
    .attr('class', 'cue')
    .attr('transform', cuePos)
    .call(d3.behavior.drag()
          .origin(cueOrigin)
          .on('drag', dragCue)
          .on('dragend', saveCue));

cue.append('rect').attr({ width: 15, height: 15 });

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
    blocks.select('rect').classed('on', false);
    hashset();
});

setbar(4);
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

function pause() {
    tonegenerator.freq(-1);
    if (stepi) window.clearTimeout(stepi);
    stepi = null;
}

function play() {
    if (stepi !== null) return;
    step();
}

var playing = true;
d3.select('#play-pause').on('click', function() {
    playing = !playing;
    d3.select(this).select('i')
        .attr('class', function() {
            return playing ? 'icon-pause' : 'icon-play';
        });
    if (playing) {
        step();
    } else {
        pause();
    }
});

visibility().on('hide', pause).on('show', play);

function sinetone(_) {
    var s = {},
        phase = 0,
        freq,
        phaseStep;

    s.freq = function(_) {
        freq = _;
        phaseStep = freq / pico.samplerate;
        return s;
    };

    s.process = function(L, R) {
        var i;
        if (phaseStep < 0) {
            phase = 0;
            for (i = 0; i < L.length; i++) {
                L[i] = R[i] = 0;
            }
        } else {
            for (i = 0; i < L.length; i++) {
                L[i] = R[i] = Math.sin(6.28318 * phase) * 0.25;
                phase += phaseStep;
            }
        }
    };

    return s.freq(_);
}

var tones = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11
};

function noteFreq(tone, octave) {
    return 440 * Math.pow(Math.pow(2, 1 / 12), tone + (octave || 3) * 12 - 69);
}

var tonegenerator = sinetone();
var pos = 0, stepi;
pico.play(tonegenerator);
function step() {
    var notes = board.filter(function(d) {
        return d.time == pos && d.on;
    });
    blocks.classed('playing', function(d) {
        return d.time == pos;
    });
    if (!notes.length) {
        on = false;
        tonegenerator.freq(-1);
    } else {
        on = true;
        tonegenerator.freq(noteFreq(notes[0].note));
    }
    if (++pos > loop[1]) pos = loop[0];
    if (playing) {
        stepi = window.setTimeout(step, (60 * 1000) / bpm);
    }
}
step();
