
function go(g) {
    var generator = g();
    _go(generator, generator.next());
}

function _go(generator, step) {
    while (!step.done) {
        var result = step.value();
        var state = result[0];
        var value = result[1];

        switch (state) {
            case "wait": {
                setImmediate(function() { _go(generator, step); });
                return;
            }

            case "continue": {
                step = generator.next(value);
                break;
            }
        }
    }
}

function put(chan, val) {
    return function() {
        if (chan.length == 0) {
            chan.push(val);
            return [ "continue", null ];
        } else {
            return [ "wait", null ];
        }
    };
}

function take(chan) {
    return function() {
        var val;

        if (chan.length == 0) {
            return [ "wait", null ];
        } else {
            val = chan.pop();
            return [ "continue", val ];
        }
    };
}

exports.go   = go;
exports.take = take;
exports.put  = put;