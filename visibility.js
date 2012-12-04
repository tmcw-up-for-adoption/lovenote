function visibility() {
    var event = d3.dispatch('show', 'hide');
    // Set the name of the hidden property and the change event for visibility
    var hidden, visibilityChange;
    // Opera 12.10 and Firefox 18 and later support
    if (typeof document.hidden !== "undefined") {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.mozHidden !== "undefined") {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }

    document.addEventListener(visibilityChange, function() {
        if (document[hidden]) event.hide();
        else event.show();
    }, false);

    return event;
}
