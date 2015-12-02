var QueueReader = require("./reader");
var _ = require("lodash");
var assert = require("assert");
var redis = require("redis");
var whilst = require("../../util/util").whilstProduces;
var log = require("debug")("queue");
var RedisReader;

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
 * RedisReader
 *
 * @class
 * @extends QueueReader
 */
RedisReader = QueueReader.extend(
    /**
     * @lends RedisReader.prototype
     */
    {
        constructor: function() {
            QueueReader.prototype.constructor.apply(this, arguments);
            this.initialize();
            this.subscribed = false;
            this.pattern = "__keyspace@*:" + this.options.queue;
        },

        initialize: function() {
            var self = this;

            this.client = createClient();
            this.listener = createClient()
                .then(function(listener) {
                    var bypass = false;
                    var bypassCount = 0;
                    var repopTimeoutID;

                    function doPop() {
                        if (bypass) {
                            bypassCount++;
                            return;
                        }

                        clearTimeout(repopTimeoutID);
                        bypass = true;

                        self
                            ._pop()
                            .then(function() {
                                bypass = false;

                                if (bypassCount > 0) {
                                    repopTimeoutID = setTimeout(function() {
                                        log('after timeout bypass');
                                        doPop();
                                    }, self.options.repop_timeout);
                                    bypassCount = 0;
                                }
                            });
                    }

                    listener.on("pmessage", function (pattern, channel, message) {
                        if (message != "lpush" && message != "rpush") {
                            return;
                        }

                        doPop();
                    });

                    return listener;
                });

            this.init = Promise.all([this.client, this.listener]);
            this.subscribeLock = this.init.then(_.noop)
        },

        _pop: function() {
            var self = this;

            return this.client
                .then(function(client) {
                    return new Promise(function(resolve, reject) {
                        var count = 0;

                        whilst(
                            function(next, stop) {
                                client.lpop(self.options.queue, function(err, msg) {
                                    if (err) {
                                        return stop(err);
                                    }

                                    if (!msg) {
                                        return stop();
                                    }

                                    next(msg);
                                });
                            },
                            function(next, stop, msg) {
                                count++;

                                if (!self.push(new Buffer(msg))) {
                                    self._unsubscribe();
                                    return stop();
                                }

                                if (count >= self.options.limit_per_event) {
                                    return stop();
                                }

                                if (self._readableState.buffer.length > 0) {
                                    log('WARNING BUFFER OVERLOAD', self._readableState.buffer.length);
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

        _subscribe: function() {
            var self = this;

            return this.subscribeLock = this
                .subscribeLock
                .then(function() {
                    return self.listener;
                })
                .then(function(listener) {
                    if (self.subscribed) {
                        return;
                    }

                    return new Promise(function(resolve, reject) {
                        listener.psubscribe(self.pattern, function (err) {
                            if (err) {
                                log('subscribe err', err);
                                return reject(err);
                            }

                            log('subscribed to', self.pattern);
                            self.subscribed = true;

                            resolve();
                        });
                    });
                })
                .then(_.noop, _.noop);
        },

        _unsubscribe: function() {
            var self = this;

            return this.subscribeLock = this.subscribeLock
                .then(function() {
                    return self.listener;
                })
                .then(function(listener) {
                    if (!self.subscribed) {
                        return;
                    }

                    return new Promise(function(resolve, reject) {
                        listener.punsubscribe(self.pattern, function (err) {
                            if (err) {
                                log('unsubscribe err %s', err);
                                return reject(err);
                            }

                            log('unsubscribed from %s', self.pattern);
                            self.subscribed = false;

                            resolve();
                        });
                    });
                })
                .then(_.noop, _.noop);
        },

        pause: function() {
            this._unsubscribe();
            QueueReader.prototype.pause.call(this);
        },

        resume: function() {
            this._subscribe();
            QueueReader.prototype.resume.call(this);
        },

        _read: function(size) {
            this._subscribe();
        }
    },

    {
        DEFAULTS: {
            queue: "messages",
            limit_per_event: 10,
            repop_timeout: 5000
        }
    }
);

module.exports = RedisReader;