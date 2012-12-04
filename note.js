lovenote.note = function() {
    var n = {},
        ctx = new webkitAudioContext(),
        stream_length = 1024,
        node = ctx.createJavaScriptNode(stream_length, 1, 2),
        volume = ctx.createGainNode();

    volume.gain.value = 0.1;
    node.connect(volume);
    volume.connect(ctx.destination);

    // a triangle wave
    var tri = (function(sample_rate) {
        var phase = 0,
            phaseStep = 110 / sample_rate;
        return function(p) {
            p /= 4;
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

    function add(waves, i) {
        return waves.map(function(w) {
            return w[i];
        }).reduce(function(mem, w) {
            return mem + w;
        }, 0) / (waves.length + 1);
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

    n.freq = function(_) {
        if (!arguments.length) return freq;
        freq = _;
        return freq;
    };

    return n;
};
