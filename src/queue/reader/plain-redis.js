var QueueReader = require("./reader");
var _ = require("lodash");
var assert = require("assert");
var redis = require("redis");
var whilst = require("../../util/util").whilstProduces;
var log = require("debug")("queue");
var ErrorsReader;

function createClient() {
    return new Promise(function(resolve, reject) {
        var res = _.once(resolve);
        var rej = _.once(reject);

        var client = redis.createClient();

        client.on('ready', res.bind(null, client));
        client.on('error', rej);
    });
}

/**
 * ErrorsReader
 *
 * @class
 * @extends QueueReader
 */
ErrorsReader = QueueReader.extend(
    /**
     * @lends ErrorsReader.prototype
     */
    {
        constructor: function() {
            QueueReader.prototype.constructor.apply(this, arguments);
            this.initialize();
        },

        initialize: function() {
            this.client = createClient();
        },

        _pop: function() {
            var self = this;

            return this.client
                .then(function(client) {
                    return new Promise(function(resolve, reject) {
                        whilst(
                            function(next, stop) {
                                client.lpop(self.options.queue, function(err, msg) {
                                    if (err) {
                                        return stop(err);
                                    }

                                    if (!msg) {
                                        self.push(null);
                                        return stop();
                                    }

                                    next(msg);
                                });
                            },
                            function(next, stop, msg) {
                                if (!self.push(new Buffer(msg))) {
                                    return stop();
                                }

                                next();
                            },
                            function(err) {
                                if (err) {
                                    self.emit("error", err);
                                    log('_pop error: %s', err);
                                    return reject(err);
                                }

                                resolve();
                            }
                        );
                    });
                });
        },

        _read: function(size) {
            this._pop();
        }
    },

    {
        DEFAULTS: {
            queue: "errors"
        }
    }
);

module.exports = ErrorsReader;