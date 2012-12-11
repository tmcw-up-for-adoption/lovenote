var width = 1000,
    height = 600,
    on = false,
    note = 5,
    beats = 40,
    lowest = 24,
    tones = 24,
    highest = lowest + tones;

var note_names = 'C C# D D# E F F# G G# A A# B'.split(' ');

var scales = d3.entries({
  chromatic: d3.range(0, 12),
  cmajor: [0, 2, 4, 5, 7, 9, 11]
});

// pre-compute sinewave
var sinewave = new Float32Array((function() {
  for (var i = 0, results = []; i < 1024; i++) {
    results.push(Math.sin(2 * Math.PI * (i / 1024)));
  }
  return results;
})());

// Turn a tone number into a reasonable frequency in Hz
function noteFreq(tone, octave) {
    return 440 * Math.pow(Math.pow(2, 1 / 12),
        tone + (octave || 3) * 12 - 69);
}

var svg = d3.select('#music')
    .append('svg')
    .attr({ width: width, height: height });

d3.select('#on').on('change', function() {
    on = this.checked;
});

function makeBoard() {
    return d3.range(0, beats).reduce(function(mem, time) {
        return mem.concat(d3.range(lowest, highest).map(function(note) {
            return {
                time: time, note: note, on: false
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
        .attr('height', height);
    bars
        .transition()
        .attr('transform', function(d) {
        return 'translate(' + (scale_time(d) - 1) + ',0)';
    });
    bars.exit().remove();
}

function setbar(_) {
    drawbars(d3.range(0, beats, _));
}

function updateBpm() {
    bpm = +d3.select('#bpm').node().value;
}

var board = makeBoard();

  Envelope = (function() {

    function Envelope() {
      this.samplerate = pico.samplerate;
      this.a = 0;
      this.d = 64;
      this.s = 32;
      this.r = 0;
      this.samples = 0;
      this.status = 0;
      this.x = 1;
      this.dx = 0;
    }

    Envelope.prototype.setParams = function(params) {
      return this.a = params[0], this.d = params[1], this.s = params[2], this.r = params[3], params;
    };

    Envelope.prototype.bang = function() {
      this.samples = 0;
      this.status = 0;
      this.x = 1;
      return this.dx = 0;
    };

    Envelope.prototype.process = function(cell) {
      var x, _i, _ref;
      while (this.samples <= 0) {
        switch (this.status) {
          case 0:
            this.status = 1;
            this.samples = this.a * this.samplerate * 0.005;
            this.x = 0;
            this.dx = (1 / this.samples) * cell.length;
            break;
          case 1:
            this.status = 2;
            this.samples = this.d * this.samplerate * 0.005;
            this.x = 1;
            this.dx = -(1 / this.samples) * cell.length;
            if (this.s > 0) {
              this.dx *= this.s / 127;
            }
            break;
          case 2:
            this.status = 3;
            this.samples = Infinity;
            this.dx = 0;
            if (this.s === 0) {
              this.x = 0;
            }
        }
      }
      x = this.x;
      for (i = _i = 0, _ref = cell.length; _i < _ref; i = _i += 1) {
        cell[i] *= x;
      }
      this.x += this.dx;
      return this.samples -= cell.length;
    };

    return Envelope;

  })();


var scale_note = d3.scale.linear()
        .domain([lowest - 2, highest - 1])
        .range([height, 0]),
    scale_time = d3.scale.linear()
        .domain([0, beats])
        .range([0, width])
        .clamp(true);

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
    .attr({ width: 23, height: 22, 'class': 'in-key' });

blocks.append('text')
    .attr('dy', 12)
    .attr('dx', 2)
    .text(function(d) {
        return note_names[(d.note) % 12];
    });

function flip() {
    var xy = d3.event.touches ?
        d3.event.touches[0] : d3.event;
    var d = d3.select(document.elementFromPoint(xy.clientX, xy.clientY)).datum();
    if (!d) return;
    d3.event.preventDefault();
    var before = d.on;
    d.on = !before;
    blocks.select('rect').classed('on', function(d) { return d.on; });
    hashset(boardhash());
}

var sn = simplenotes();

function hashset(x) {
    window.history.replaceState('', 'lovenote', '/#' + x);
}

function boardhash() {
    var bytime = d3.nest()
        .key(function(d) { return d.time; })
        .map(blocks.data().sort(function(a, b) {
            return a.time - b.time;
        }));
    var s = '';
    function ison(b) { return b.on; }
    function encnote(b) {
        return sn.encodeint(b.note - 24);
    }
    for (var i = 0; i < 40; i++) {
        s += bytime[i].filter(ison).map(encnote).join('');
        s += '-';
    }
    return s;
}

function hashboard(x) {
    var board = makeBoard();
    var n = x.split('-');
    function decnote(b) {
        return sn.decodechar(b) + 24;
    }
    for (var time = 0; time < n.length; time++) {
        if (n[time]) {
            n[time].split('').map(decnote).forEach(function(note) {
                board = board.map(function(b) {
                    if (b.note == note && b.time == time) {
                        b.on = true;
                    }
                    return b;
                });
            });
        }
    }
    setboard(board);
}

d3.select(document.body)
  .on('mousedown', flip)
  .on('touchstart', flip)
  .on('touchmove', flip);

blocks
.on('mouseover', function(d) {
    if (!d3.event.which) return;
    d.on = !d.on;
    blocks.select('rect').classed('on', function(d) { return d.on; });
});

var timeline = svg.selectAll('g.timeline')
    .data(d3.range.apply(null, scale_time.domain()))
    .enter()
    .append('g')
    .attr('class', 'timeline')
    .attr('transform', function(d) {
        return 'translate(' + scale_time(d) + ',0)';
    });

timeline.append('rect').attr({ width: 23, height: 15 });

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

cue.append('rect').attr({ width: 23, height: 15 });

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

function setscale(s) {
    var default_height = 22;
    var percent_on = s.length / 12;
    var off_blocks = 12 - s.length;

    // the total height before
    var total_height = default_height * 12;

    // off-blocks should occupy half as much space
    var off_height = (off_blocks * default_height) / 2;

    var on_height = total_height - off_height;
    var on_block_height = on_height / s.length;
    var off_block_height = off_height / off_blocks;

    function ison(d) {
        return s.indexOf(d % 12) !== -1;
    }

    function p_scale_note(d) {
        var h = height;
        for (var i = lowest - 1; i <= d; i++) {
            h -= ison(i) ? on_block_height : off_block_height;
            h -= 2;
        }
        return h;
    }

    blocks
        .transition()
        .duration(1000)
        .attr('transform', function(d, i) {
            return 'translate(' +
                        scale_time(d.time) + ',' +
                        p_scale_note(d.note) + ')';
        });

    blocks.select('rect')
        .classed('in-key', function(d) {
          return ison(d.note);
        })
        .transition()
        .duration(1000)
        .attr({
          height: function(d) {
              return ison(d.note) ?
                on_block_height : off_block_height;
            }
          });
}

d3.select('#scale')
    .on('change', function() {
        var v = this.value;
        setscale(d3.select('#scale').selectAll('option')
            .filter(function(d) {
                return d.key == v;
            }).datum().value);
    })
    .selectAll('option')
    .data(scales)
    .enter()
        .append('option')
        .text(function(d) {
            return d.key;
        })
        .attr('value', function(d) {
            return d.key;
        });

function reset() {
    setboard(makeBoard());
}

function setboard(board) {
    blocks.data(board);
    blocks.select('rect').classed('on', function(b) {
        return b.on;
    });
}

d3.select('#reset')
    .on('touchstart', reset)
    .on('click', reset);

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
    tonegenerator.freqs([]);
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

function sinetone() {
    var s = {},
        e = new Envelope(),
        cell = new Float32Array(pico.cellsize),
        phases = [],
        freqs,
        amp = 1,
        fblv = 0.097 * 1024,
        fbs = [],
        phaseSteps;

    var delay = new pico.DelayNode({ time:200, feedback:0.15, wet: 0.1 });

    s.freqs = function(_) {
        freqs = _;
        amp = 1;
        phaseSteps = freqs.map(function(f) {
            return (1024 * f) / pico.samplerate;
        });
        if (phases.length !== phaseSteps.length) {
            phases = d3.range(0, _.length).map(function() { return 0; });
            fbs = d3.range(0, _.length).map(function() { return 0; });
        }
        return s;
    };

    s.process = function(L, R) {
        var i;
        if (phaseSteps.length < 0) {
            phases = [];
            for (i = 0; i < L.length; i++) {
                L[i] = R[i] = 0;
            }
        } else {
            for (i = 0; i < L.length; i++) R[i] = L[i] = 0;
            var len = phaseSteps.length;
            for (var f = 0; f < phaseSteps.length; f++) {
                var phaseStep = phaseSteps[f];
                for (i = 0; i < L.length; i++) {
                    R[i] = L[i] = R[i] + ((sinewave[(phases[f] + fbs[f] * fblv) & 1023] * amp) / len);
                    fbs[f] = L[i];
                    phases[f] += phaseStep;
                }
            }
            amp *= 0.96;
        }
        delay.process(L, R);
    };

    return s.freqs([]);
}

var tonegenerator = sinetone();
var pos = 0, stepi;

function setup() {
    pico.play(tonegenerator);
}

if ('ontouchstart' in document.body) {
    d3.select(document.body)
        .append('a')
        .attr('class', 'starter')
        .attr('href', '#')
        .text('start')
        .on('touchstart', function() {
            setup();
            d3.select(this).remove();
        });
} else {
    setup();
}

function step() {
    var notes = blocks.data().filter(function(d) {
        return d.time == pos && d.on;
    });
    blocks.classed('playing', function(d) {
        return d.time == pos;
    });
    if (!notes.length) {
        on = false;
        tonegenerator.freqs([]);
    } else {
        on = true;
        tonegenerator.freqs(notes.map(function(n) {
            return noteFreq(n.note);
        }));
    }
    if (++pos > loop[1]) pos = loop[0];
    if (playing) {
        stepi = window.setTimeout(step, (60 * 1000) / bpm);
    }
}
step();

// setscale([0, 2, 4, 5, 7, 9, 11]);
setscale(d3.range(0, 12));

if (window.location.hash) {
    hashboard(window.location.hash.slice(1));
}
