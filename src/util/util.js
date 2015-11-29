var _ = require("lodash");

function defer() {
    var dfd = {};

    dfd.promise = new Promise(function(resolve, reject) {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });

    return dfd;
}

function deferTimeout(timeout) {
    var dfd = {};

    dfd.promise = new Promise(function(resolve, reject) {
        dfd.resolve = _.once(resolve);
        dfd.reject = _.once(reject);

        setTimeout(function() {
            reject("timed out");
        }, timeout);
    });

    return dfd;
}

exports.defer = defer;
exports.deferTimeout = deferTimeout;