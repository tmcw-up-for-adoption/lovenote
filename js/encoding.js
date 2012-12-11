function simplenotes() {
    var s = {};

    var table = (function() {
        var t = [], i;
        for (i = 65; i < 91; i++) t.push(String.fromCharCode(i));
        for (i = 97; i < 123; i++) t.push(String.fromCharCode(i));
        for (i = 0; i < 10; i++) t.push(i);
        return t;
    })();

    s.encodeint = function(x) {
        return table[x];
    };

    s.decodechar = function(x) {
        return table.indexOf(x);
    };

    return s;
}
