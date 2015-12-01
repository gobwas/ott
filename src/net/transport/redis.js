var Transport = require("./transport");
var _ = require("lodash");
var assert = require("assert");
var redis = require("redis");
var types = require("../protocol/types");
var Request = types.Request;
var Response = types.Response;
var ErrorMsg = types.Error;
var deferTimeout = require("../../util/util").deferTimeout;
var uuid = require("uuid");
var RedisTransport;

const MSG_INITIAL = "initial";

/**
 * RedisTransport
 *
 * @class
 * @extends Transport
 */
RedisTransport = Transport.extend(
    /**
     * @lends RedisTransport.prototype
     */
    {
        constructor: function(proto, options) {
            Transport.prototype.constructor.apply(this, arguments);
            this.address = options.address || uuid.v4();
            this.handlers = {};
            this.pending = {};
        },

        /**
         * @abstract
         */
        initialize: function() {
            var self = this;
            var server = this.server = redis.createClient();
            var client = this.client = redis.createClient();

            return Promise
                .all([ client, server ].map(function(c) {
                    return new Promise(function(resolve, reject) {
                        c.on("ready", function() {
                            resolve();
                        });

                        c.on("error", function(err) {
                            reject(err);
                        });
                    });
                }))
                .then(function() {
                    return new Promise(function(resolve, reject) {
                        client.llen(self.address, function (err, len) {
                            if (err) {
                                return reject(err);
                            }

                            if (len > 0) {
                                return reject(new Error("address already in use"));
                            }

                            process.on("SIGINT", function() {
                                client.del(self.address);
                            });

                            client.lpush(self.address, MSG_INITIAL, function (err) {
                                if (err) {
                                    return reject(err);
                                }

                                resolve();
                            });

                            resolve();
                        });
                    });
                })
                .then(function() {
                    return Promise.all([
                        new Promise(function(resolve, reject) {
                            server.psubscribe('__keyspace@*:' + self.address, function(err) {
                                if (err) {
                                    return reject(err);
                                }

                                resolve();
                            });
                        })
                    ]);
                })
                .then(function() {
                    server.on("pmessage", function(pattern, channel, message) {
                        if (message !== "rpush") {
                            return;
                        }

                        self.client.lpop(self.address, function(err, b) {
                            var env, msg, from, handler, pending;

                            if (err) {
                                console.log('error while getting message', err);
                                return;
                            }

                            if (!b || b == MSG_INITIAL) {
                                return;
                            }

                            try {
                                env = JSON.parse(b);
                                from = env.from;
                                msg = self.protocol.unmarshal(new Buffer(env.data));
                            } catch (err) {
                                console.log('unmarshal error', err, b.toString());
                                return
                            }


                            //console.log('receive', msg, from);

                            switch (true) {
                                case msg instanceof Request: {
                                    handler = self.handlers[msg.method];
                                    if (_.isFunction(handler)) {
                                        handler(msg.params)
                                            .then(function(result) {
                                                self._sendResult(from, msg.id, result)
                                            })
                                            .catch(function(err) {
                                                self._sendError(from, msg.id, err.toString(), err.code)
                                            });
                                    }

                                    break;
                                }
                                case msg instanceof Response: {
                                    pending = self.pending[msg.id];
                                    if (!_.isUndefined(pending)) {
                                        if (_.isObject(msg.error)) {
                                            pending.reject(new Error(msg.error.message, msg.error.code))
                                        } else {
                                            pending.resolve(msg.result)
                                        }
                                    }

                                    return
                                }
                            }
                        });
                    });
                });
        },

        /**
         * @abstract
         */
        call: function(address, method, params) {
            return this._sendRequest(address, method, params);
        },

        _send: function(address, data) {
            var self = this;
            var envelope;

            envelope = {
                from: this.address,
                data: data
            };

            //console.log('send', envelope, 'to', address);

            return new Promise(function(resolve, reject) {
                self.client.rpushx(address, JSON.stringify(envelope), function(err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            });
        },

        _sendRequest: function(address, method, params) {
            var self = this;
            var id, req, dfd;

            id = uuid.v4();
            req = new Request(id, method, params);

            this.pending[id] = dfd = deferTimeout(1000);

            return self._send(address, self.protocol.marshal(req).toString())
                .then(function() {
                    return dfd.promise;
                });
        },

        _sendResult: function(address, id, result) {
            return this._send(address, this.protocol.marshal(new Response(id, result, null)).toString());
        },

        _sendError: function(address, id, err, code) {
            return this._send(address, this.protocol.marshal(new Response(id, null, new ErrorMsg(code || -1, err || "unknown error"))).toString());
        },

        /**
         * @abstract
         */
        handle: function(method, handler) {
            this.handlers[method] = handler;
        },

        /**
         * @abstract
         */
        getAddress: function() {
            return this.address;
        }
    }
);

module.exports = RedisTransport;