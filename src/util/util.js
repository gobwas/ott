var _ = require("lodash");

function every(promises) {
    return new Promise(function(resolve) {
        var results = [];
        var wait = promises.length;

        promises.forEach(function(promise, index) {
            try {
                promise
                    .then(function(result) {
                        results[index] = {result: result};
                    })
                    .catch(function(err) {
                        results[index] = {error: err}
                    })
                    .then(function() {
                        if (results.length == wait) {
                            resolve(results);
                        }
                    });
            } catch (err) {
                console.log(err);
            }

        });
    });
}

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

function whilstProduces(producer, consumer, callback) {
    producer.call(null,
        // next
        function(item) {
            consumer.call(null,
                // next
                whilstProduces.bind(null, producer, consumer, callback),
                // stop
                callback,
                // item
                item
            );
        },
        // stop
        callback
    );
}

exports.whilstProduces = whilstProduces;
exports.defer = defer;
exports.every = every;
exports.deferTimeout = deferTimeout;